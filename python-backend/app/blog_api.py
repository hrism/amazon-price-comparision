"""
ブログ用API
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import json

router = APIRouter(prefix="/api/blog", tags=["blog"])


class BlogPostResponse(BaseModel):
    """ブログ記事レスポンス"""
    id: str
    title: str
    slug: str
    content: str
    excerpt: str
    featured_image: Optional[str]
    category: Optional[dict]
    tags: List[dict]
    author: dict
    published_at: datetime
    updated_at: datetime
    view_count: int
    meta_title: Optional[str]
    meta_description: Optional[str]
    meta_keywords: Optional[str]


class CategoryResponse(BaseModel):
    """カテゴリーレスポンス"""
    id: int
    name: str
    slug: str
    description: str
    post_count: int


@router.get("/posts", response_model=List[BlogPostResponse])
async def get_blog_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None
):
    """ブログ記事一覧取得"""
    # Django ORMを使用してデータ取得
    from django.utils import timezone
    from app.models import BlogPost
    
    queryset = BlogPost.objects.filter(
        status='published',
        published_at__lte=timezone.now()
    ).select_related('author', 'category').prefetch_related('tags')
    
    # フィルタリング
    if category:
        queryset = queryset.filter(category__slug=category)
    if tag:
        queryset = queryset.filter(tags__slug=tag)
    if search:
        queryset = queryset.filter(
            models.Q(title__icontains=search) |
            models.Q(content__icontains=search) |
            models.Q(excerpt__icontains=search)
        )
    
    # ページネーション
    total = queryset.count()
    start = (page - 1) * per_page
    end = start + per_page
    posts = queryset[start:end]
    
    # レスポンス作成
    result = []
    for post in posts:
        result.append({
            'id': str(post.id),
            'title': post.title,
            'slug': post.slug,
            'content': post.content,
            'excerpt': post.excerpt,
            'featured_image': post.featured_image,
            'category': {
                'id': post.category.id,
                'name': post.category.name,
                'slug': post.category.slug
            } if post.category else None,
            'tags': [
                {'id': tag.id, 'name': tag.name, 'slug': tag.slug}
                for tag in post.tags.all()
            ],
            'author': {
                'id': post.author.id,
                'username': post.author.username,
                'first_name': post.author.first_name,
                'last_name': post.author.last_name
            },
            'published_at': post.published_at.isoformat(),
            'updated_at': post.updated_at.isoformat(),
            'view_count': post.view_count,
            'meta_title': post.meta_title,
            'meta_description': post.meta_description,
            'meta_keywords': post.meta_keywords
        })
    
    return result


@router.get("/posts/{slug}", response_model=BlogPostResponse)
async def get_blog_post(slug: str):
    """個別記事取得"""
    from django.utils import timezone
    from app.models import BlogPost
    
    try:
        post = BlogPost.objects.select_related('author', 'category').prefetch_related('tags').get(
            slug=slug,
            status='published',
            published_at__lte=timezone.now()
        )
    except BlogPost.DoesNotExist:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # ビューカウント増加
    post.view_count += 1
    post.save(update_fields=['view_count'])
    
    return {
        'id': str(post.id),
        'title': post.title,
        'slug': post.slug,
        'content': post.content,
        'excerpt': post.excerpt,
        'featured_image': post.featured_image,
        'category': {
            'id': post.category.id,
            'name': post.category.name,
            'slug': post.category.slug
        } if post.category else None,
        'tags': [
            {'id': tag.id, 'name': tag.name, 'slug': tag.slug}
            for tag in post.tags.all()
        ],
        'author': {
            'id': post.author.id,
            'username': post.author.username,
            'first_name': post.author.first_name,
            'last_name': post.author.last_name
        },
        'published_at': post.published_at.isoformat(),
        'updated_at': post.updated_at.isoformat(),
        'view_count': post.view_count,
        'meta_title': post.meta_title or post.title,
        'meta_description': post.meta_description or post.excerpt,
        'meta_keywords': post.meta_keywords
    }


@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories():
    """カテゴリー一覧取得"""
    from app.models import Category
    from django.db.models import Count
    
    categories = Category.objects.annotate(
        post_count=Count('posts', filter=models.Q(posts__status='published'))
    )
    
    return [
        {
            'id': cat.id,
            'name': cat.name,
            'slug': cat.slug,
            'description': cat.description,
            'post_count': cat.post_count
        }
        for cat in categories
    ]


@router.get("/tags")
async def get_tags():
    """タグ一覧取得"""
    from app.models import Tag
    from django.db.models import Count
    
    tags = Tag.objects.annotate(
        post_count=Count('posts', filter=models.Q(posts__status='published'))
    ).filter(post_count__gt=0)
    
    return [
        {
            'id': tag.id,
            'name': tag.name,
            'slug': tag.slug,
            'post_count': tag.post_count
        }
        for tag in tags
    ]


@router.get("/sitemap")
async def get_blog_sitemap():
    """ブログ用サイトマップ生成"""
    from app.models import BlogPost
    from django.utils import timezone
    
    posts = BlogPost.objects.filter(
        status='published',
        published_at__lte=timezone.now()
    ).values('slug', 'updated_at')
    
    base_url = "https://amazon-price-comparision.vercel.app"
    
    urls = []
    for post in posts:
        urls.append({
            'loc': f"{base_url}/blog/{post['slug']}",
            'lastmod': post['updated_at'].isoformat(),
            'changefreq': 'weekly',
            'priority': 0.8
        })
    
    # カテゴリーページも追加
    from app.models import Category
    categories = Category.objects.all()
    for cat in categories:
        urls.append({
            'loc': f"{base_url}/blog/category/{cat.slug}",
            'lastmod': datetime.now().isoformat(),
            'changefreq': 'daily',
            'priority': 0.6
        })
    
    return urls