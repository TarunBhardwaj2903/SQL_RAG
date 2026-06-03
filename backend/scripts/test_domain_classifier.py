"""Run with: python backend/scripts/test_domain_classifier.py"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.domain_classifier import (
    classify_domains_by_keywords, get_tables_for_domains, DOMAIN_TREE
)

tests = [
    ("what are monthly sales trends", {"sales"}),
    ("show top products by revenue", {"sales", "products"}),
    ("employee headcount by department", {"hr"}),
    ("vendor lead times", {"purchasing"}),
    ("customer address in Seattle", {"sales", "people"}),
    ("manufacturing work orders this week", {"manufacturing"}),
    ("show all orders and the product name", {"sales", "products"}),
    ("who manages each department", {"hr"}),
]

all_pass = True
for question, expected_subset in tests:
    result = set(classify_domains_by_keywords(question))
    tables = get_tables_for_domains(list(result) or list(DOMAIN_TREE.keys()))
    ok = result >= expected_subset
    status = "✅" if ok else "❌"
    if not ok:
        all_pass = False
    print(f"{status} '{question}'")
    print(f"   Got: {sorted(result)}  Expected ⊇ {sorted(expected_subset)}")
    print(f"   Table pool: {len(tables)} tables")

print("\n" + ("All tests passed ✅" if all_pass else "Some tests failed ❌"))
