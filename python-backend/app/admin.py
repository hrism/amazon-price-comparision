from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import BlogPost, Category, Tag, BlogImage


# 権限グループの設定
def setup_groups():
    """権限グループの初期設定"""
    # 編集者グループ作成
    editor_group, created = Group.objects.get_or_create(name='編集者')
    if created:
        from django.contrib.auth.models import Permission
        # ブログ関連の権限のみ付与
        permissions = Permission.objects.filter(
            content_type__app_label='app',
            content_type__model__in=['blogpost', 'category', 'tag', 'blogimage']
        )
        editor_group.permissions.set(permissions)


class BlogPostAdmin(admin.ModelAdmin):
    """ブログ記事管理"""
    list_display = ['title', 'author', 'category', 'status', 'published_at', 'view_count']
    list_filter = ['status', 'category', 'tags', 'published_at']
    search_fields = ['title', 'content', 'excerpt']
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'published_at'
    ordering = ['-published_at']
    
    fieldsets = (
        ('基本情報', {
            'fields': ('title', 'slug', 'content', 'excerpt', 'featured_image')
        }),
        ('分類', {
            'fields': ('category', 'tags')
        }),
        ('公開設定', {
            'fields': ('status', 'published_at')
        }),
        ('SEO設定', {
            'fields': ('meta_title', 'meta_description', 'meta_keywords'),
            'classes': ('collapse',)
        }),
        ('統計', {
            'fields': ('view_count',),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ('tags',)
    
    def save_model(self, request, obj, form, change):
        """保存時に著者を自動設定"""
        if not change:  # 新規作成時
            obj.author = request.user
        super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        """編集者は自分の記事のみ表示"""
        qs = super().get_queryset(request)
        if not request.user.is_superuser:
            qs = qs.filter(author=request.user)
        return qs
    
    def has_change_permission(self, request, obj=None):
        """編集権限の制御"""
        if obj and not request.user.is_superuser:
            return obj.author == request.user
        return super().has_change_permission(request, obj)
    
    def has_delete_permission(self, request, obj=None):
        """削除権限の制御"""
        if obj and not request.user.is_superuser:
            return obj.author == request.user
        return super().has_delete_permission(request, obj)


class CategoryAdmin(admin.ModelAdmin):
    """カテゴリー管理"""
    list_display = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name', 'description']


class TagAdmin(admin.ModelAdmin):
    """タグ管理"""
    list_display = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']


class BlogImageAdmin(admin.ModelAdmin):
    """画像管理"""
    list_display = ['title', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at', 'uploaded_by']
    search_fields = ['title', 'alt_text']
    readonly_fields = ['uploaded_by', 'uploaded_at']
    
    def save_model(self, request, obj, form, change):
        """アップロードユーザーを自動設定"""
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


class CustomUserAdmin(BaseUserAdmin):
    """ユーザー管理のカスタマイズ"""
    def get_readonly_fields(self, request, obj=None):
        """編集者はユーザー管理不可"""
        if not request.user.is_superuser:
            return self.get_fields(request, obj)
        return super().get_readonly_fields(request, obj)
    
    def has_add_permission(self, request):
        """編集者はユーザー追加不可"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """編集者はユーザー削除不可"""
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        """編集者は自分のプロフィールのみ編集可"""
        if not request.user.is_superuser:
            return obj == request.user if obj else False
        return super().has_change_permission(request, obj)


# 登録
admin.site.register(BlogPost, BlogPostAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(BlogImage, BlogImageAdmin)

# ユーザー管理を再登録
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)

# 管理画面のカスタマイズ
admin.site.site_header = "日用品価格比較 管理画面"
admin.site.site_title = "管理画面"
admin.site.index_title = "ダッシュボード"