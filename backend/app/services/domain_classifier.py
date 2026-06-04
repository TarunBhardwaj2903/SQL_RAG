"""
domain_classifier.py — Schema Tree Navigation
Classifies user query into domains using keyword matching with
stemming (primary, ~0ms) then embedding cosine similarity (fallback).
"""
import re
import logging
import numpy as np
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DOMAIN_TREE: Dict[str, List[str]] = {
    "sales": [
        "sales.salesorderheader", "sales.salesorderdetail",
        "sales.customer", "sales.store", "sales.salesperson",
        "sales.salespersonquotahistory", "sales.salesterritory",
        "sales.salesterritoryhistory", "sales.salesreason",
        "sales.salesorderheadersalesreason", "sales.specialoffer",
        "sales.specialofferproduct", "sales.creditcard",
        "sales.personcreditcard", "sales.currencyrate",
        "sales.currency", "sales.countryregioncurrency",
        "sales.vindividualcustomer",
    ],
    "products": [
        "production.product", "production.productcategory",
        "production.productsubcategory", "production.productmodel",
        "production.productdescription",
        "production.productmodelproductdescriptionculture",
        "production.productreview", "production.productlistpricehistory",
        "production.productcosthistory", "production.productinventory",
        "production.location", "production.productdocument",
        "production.illustration",
    ],
    "manufacturing": [
        "production.workorder", "production.workorderrouting",
        "production.scrapreason", "production.billofmaterials",
        "production.culture", "production.transactionhistory",
        "production.transactionhistoryarchive",
    ],
    "purchasing": [
        "purchasing.vendor", "purchasing.purchaseorderheader",
        "purchasing.purchaseorderdetail", "purchasing.productvendor",
        "purchasing.shipmethod",
    ],
    "hr": [
        "humanresources.employee",
        "humanresources.employeedepartmenthistory",
        "humanresources.employeepayhistory",
        "humanresources.department", "humanresources.shift",
        "humanresources.jobcandidate", "humanresources.vemployee",
    ],
    "people": [
        "person.person", "person.personphone", "person.emailaddress",
        "person.address", "person.addresstype",
        "person.businessentity", "person.businessentityaddress",
        "person.businessentitycontact", "person.contacttype",
        "person.countryregion", "person.stateprovince",
        "person.phonenumbertype",
    ],
}

# Bridge tables included when parent domain is selected
DOMAIN_ADJACENCY: Dict[str, List[str]] = {
    "sales": ["person.person", "production.product",
              "production.productsubcategory", "humanresources.employee"],
    "products": ["sales.salesorderdetail", "purchasing.productvendor"],
    "hr": ["person.person", "sales.salesperson"],
    "purchasing": ["production.product", "person.businessentity"],
    "manufacturing": ["production.product", "purchasing.productvendor"],
    "people": [],
}

# Domain description strings for embedding-based fallback
DOMAIN_DESCRIPTIONS: Dict[str, str] = {
    "sales": "Sales orders revenue customers territories discounts promotions salespeople invoices ARR MRR pipeline deals",
    "products": "Products categories prices costs inventory stock SKU product models reviews margins subcategory",
    "manufacturing": "Manufacturing work orders bill of materials routing scrap assembly production facilities",
    "purchasing": "Purchasing vendors suppliers purchase orders procurement lead times shipping freight",
    "hr": "Employees departments salaries headcount hiring shifts HR workforce managers job applicants",
    "people": "People persons contacts addresses phone numbers email cities regions geography postal",
}

# Keywords include stems — strip s/ed/ing handled by _stem()
DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "sales": ["sale", "revenue", "order", "customer", "territory",
              "discount", "promotion", "store", "invoice", "arr", "mrr",
              "churn", "pipeline", "deal", "quota", "commission", "coupon", "refund"],
    "products": ["product", "categor", "subcategor", "price", "cost",
                 "inventor", "stock", "model", "review", "bom", "component",
                 "sku", "margin", "markup", "catalog"],
    "manufacturing": ["manufactur", "work order", "scrap", "rout", "assembl",
                      "production", "bill of material", "process"],
    "purchasing": ["vendor", "supplier", "purchas", "procurement", "lead time",
                   "ship", "freight", "reorder"],
    "hr": ["employee", "staff", "department", "salary", "pay",
           "hire", "shift", "headcount", "workforce", "manager",
           "team", "job", "applicant", "recruit"],
    "people": ["person", "contact", "address", "phone", "email",
               "city", "state", "country", "region", "postcode", "zip", "location"],
}


def _stem(word: str) -> str:
    """Minimal suffix stripping. No NLP library required."""
    for suffix in ("ing", "ed", "ers", "er", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 4:
            return word[:-len(suffix)]
    return word


def classify_domains_by_keywords(question: str) -> List[str]:
    """Fast deterministic classifier. Returns [] if nothing matches."""
    q_lower = question.lower()
    q_stemmed = " ".join(_stem(t) for t in re.findall(r"[a-z]+", q_lower))
    matched = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw in q_stemmed or kw in q_lower:
                if domain not in matched:
                    matched.append(domain)
                break
    return matched


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    a_arr, b_arr = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    norm_a, norm_b = np.linalg.norm(a_arr), np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


async def classify_domains_by_embedding(
    query_vector: List[float],
    domain_embeddings: Dict[str, List[float]],
    threshold: float = 0.30,
) -> List[str]:
    """Embedding similarity fallback. Returns domains above threshold."""
    scores = {d: cosine_similarity(query_vector, emb)
              for d, emb in domain_embeddings.items()}
    logger.info(f"Domain embedding scores: {scores}")
    matched = [d for d, s in scores.items() if s >= threshold]
    return matched if matched else list(DOMAIN_TREE.keys())


def get_tables_for_domains(domains: List[str]) -> List[str]:
    """Return all table names for domains, including bridge tables."""
    tables: set = set()
    for domain in domains:
        tables.update(DOMAIN_TREE.get(domain, []))
        tables.update(DOMAIN_ADJACENCY.get(domain, []))
    return list(tables)
