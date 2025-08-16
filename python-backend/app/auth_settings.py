"""
認証とセキュリティ設定
"""
import re
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import UserAttributeSimilarityValidator
from django.utils.translation import gettext as _
from django.core.cache import cache
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
import hashlib
from datetime import datetime, timedelta

User = get_user_model()


class StrongPasswordValidator:
    """強力なパスワードポリシー"""
    
    def __init__(self, min_length=12):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        # 長さチェック
        if len(password) < self.min_length:
            raise ValidationError(
                _(f"パスワードは{self.min_length}文字以上である必要があります。"),
                code='password_too_short',
            )
        
        # 大文字チェック
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("パスワードには少なくとも1つの大文字を含める必要があります。"),
                code='password_no_upper',
            )
        
        # 小文字チェック
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("パスワードには少なくとも1つの小文字を含める必要があります。"),
                code='password_no_lower',
            )
        
        # 数字チェック
        if not re.search(r'\d', password):
            raise ValidationError(
                _("パスワードには少なくとも1つの数字を含める必要があります。"),
                code='password_no_digit',
            )
        
        # 特殊文字チェック
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
            raise ValidationError(
                _("パスワードには少なくとも1つの特殊文字を含める必要があります。"),
                code='password_no_special',
            )
        
        # 連続文字チェック（3文字以上の連続を禁止）
        for i in range(len(password) - 2):
            if password[i] == password[i+1] == password[i+2]:
                raise ValidationError(
                    _("同じ文字を3回以上連続で使用することはできません。"),
                    code='password_repeated_chars',
                )
        
        # よくあるパスワードパターンのチェック
        common_patterns = [
            'password', 'qwerty', '123456', 'admin', 'letmein',
            'welcome', 'monkey', 'dragon', 'master', 'abc123'
        ]
        password_lower = password.lower()
        for pattern in common_patterns:
            if pattern in password_lower:
                raise ValidationError(
                    _("よく使われるパスワードパターンは使用できません。"),
                    code='password_common_pattern',
                )
    
    def get_help_text(self):
        return _(
            f"パスワードは{self.min_length}文字以上で、"
            "大文字・小文字・数字・特殊文字をそれぞれ1つ以上含む必要があります。"
        )


class RateLimitedAuthBackend(ModelBackend):
    """ログイン試行制限付き認証バックエンド"""
    
    MAX_ATTEMPTS = 5  # 最大試行回数
    LOCKOUT_DURATION = 900  # ロックアウト時間（秒）= 15分
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None
        
        # IPアドレス取得
        ip_address = self.get_client_ip(request) if request else 'unknown'
        
        # ロックアウトチェック
        lockout_key = f'auth_lockout_{username}_{ip_address}'
        attempts_key = f'auth_attempts_{username}_{ip_address}'
        
        if cache.get(lockout_key):
            # ロックアウト中
            raise ValidationError(
                _("Too many failed login attempts. Please try again later."),
                code='account_locked',
            )
        
        # 通常の認証処理
        user = super().authenticate(request, username=username, password=password, **kwargs)
        
        if user:
            # 成功したら試行回数をリセット
            cache.delete(attempts_key)
            cache.delete(lockout_key)
            
            # ログイン履歴を記録
            self.log_login(user, ip_address, success=True)
        else:
            # 失敗したら試行回数を増やす
            attempts = cache.get(attempts_key, 0)
            attempts += 1
            
            if attempts >= self.MAX_ATTEMPTS:
                # ロックアウト
                cache.set(lockout_key, True, self.LOCKOUT_DURATION)
                cache.delete(attempts_key)
                
                # ログイン履歴を記録
                self.log_login(username, ip_address, success=False, locked=True)
                
                raise ValidationError(
                    _(f"アカウントがロックされました。{self.LOCKOUT_DURATION // 60}分後に再試行してください。"),
                    code='account_locked',
                )
            else:
                # 試行回数を記録
                cache.set(attempts_key, attempts, self.LOCKOUT_DURATION)
                
                # ログイン履歴を記録
                self.log_login(username, ip_address, success=False)
        
        return user
    
    def get_client_ip(self, request):
        """クライアントIPアドレスを取得"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def log_login(self, user_or_username, ip_address, success=True, locked=False):
        """ログイン試行をログに記録"""
        from .models import LoginLog
        
        if isinstance(user_or_username, User):
            username = user_or_username.username
            user = user_or_username
        else:
            username = user_or_username
            user = None
        
        LoginLog.objects.create(
            user=user,
            username=username,
            ip_address=ip_address,
            success=success,
            locked=locked
        )


