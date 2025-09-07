from typing import Dict, Type
from .base import BaseScraper
from .toilet_paper import ToiletPaperScraper
from .dishwashing import DishwashingScraper
from .mineral_water import MineralWaterScraper
from .rice import RiceScraper
from .mask import MaskScraper

# スクレイパーレジストリ
SCRAPER_REGISTRY: Dict[str, Type[BaseScraper]] = {
    "toilet_paper": ToiletPaperScraper,
    "dishwashing_liquid": DishwashingScraper,
    "mineral_water": MineralWaterScraper,
    "rice": RiceScraper,
    "mask": MaskScraper,
    # 新しい商品タイプはここに追加
    # "tissues": TissueScraper,
    # "paper_towels": PaperTowelScraper,
}

def get_scraper(product_type: str, scraper, parser, db) -> BaseScraper:
    """商品タイプに対応するスクレイパーを取得"""
    scraper_class = SCRAPER_REGISTRY.get(product_type)
    if not scraper_class:
        raise ValueError(f"Unknown product type: {product_type}")
    return scraper_class(scraper, parser, db)

def get_all_product_types() -> list:
    """全商品タイプのリストを取得"""
    return list(SCRAPER_REGISTRY.keys())