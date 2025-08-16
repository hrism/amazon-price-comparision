from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
import uuid


class Category(models.Model):
    """ブログカテゴリー"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    """ブログタグ"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class BlogPost(models.Model):
    """ブログ記事"""
    STATUS_CHOICES = [
        ('draft', '下書き'),
        ('published', '公開'),
        ('scheduled', '予約投稿'),
    ]
    
    # 基本情報
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    content = models.TextField()
    excerpt = models.TextField(max_length=500, help_text="記事の要約（SEO用）")
    
    # メタデータ
    featured_image = models.URLField(blank=True, help_text="アイキャッチ画像のURL")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    
    # SEO
    meta_title = models.CharField(max_length=60, blank=True, help_text="SEO用タイトル（空欄の場合はtitleを使用）")
    meta_description = models.CharField(max_length=160, blank=True, help_text="SEO用説明文（空欄の場合はexcerptを使用）")
    meta_keywords = models.CharField(max_length=255, blank=True, help_text="カンマ区切りのキーワード")
    
    # 関連
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='posts')
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts')
    
    # 日時
    published_at = models.DateTimeField(null=True, blank=True, help_text="公開日時（予約投稿用）")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # カウンター
    view_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status', '-published_at']),
        ]
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # slugの自動生成
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            num = 1
            while BlogPost.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{num}"
                num += 1
            self.slug = slug
        
        # 公開日時の設定
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def is_published(self):
        """公開中かどうか"""
        if self.status != 'published':
            return False
        if self.published_at and self.published_at > timezone.now():
            return False
        return True
    
    def get_absolute_url(self):
        """記事のURL"""
        return f"/blog/{self.slug}"


class BlogImage(models.Model):
    """ブログ用画像アップロード"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    image_url = models.URLField()
    alt_text = models.CharField(max_length=200, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.title


class LoginLog(models.Model):
    """ログイン履歴"""
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    success = models.BooleanField(default=False)
    locked = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['username', 'ip_address', '-timestamp']),
        ]
    
    def __str__(self):
        status = "成功" if self.success else ("ロック" if self.locked else "失敗")
        return f"{self.username} - {self.ip_address} - {status} - {self.timestamp}"