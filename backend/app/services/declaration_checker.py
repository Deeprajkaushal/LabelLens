from typing import List, Dict, Any, Optional
from app.models.schemas import ProductBase, DeclarationCheckItem

def check_declarations(
    product: ProductBase,
    raw_text: str = ""
) -> List[DeclarationCheckItem]:
    """
    Deterministic Legal Metrology & FSSAI consumer packaging checklist.
    Assists consumers in checking for standard package declarations without giving legal advice.
    """
    checklist: List[DeclarationCheckItem] = []

    # 1. Product Name
    has_name = bool(product.name and product.name.strip() and product.name != "Unnamed Product")
    checklist.append(
        DeclarationCheckItem(
            field_name="Product Name / Identity",
            label_text="Product or Common Commodity Name",
            is_present=has_name,
            detected_value=product.name if has_name else None,
            rule_description="The package should state the common or generic name of the commodity.",
            status="Declared" if has_name else "Potentially Missing",
            guidance="Verify that the front or principal display panel clearly identifies what the product is."
        )
    )

    # 2. Net Quantity
    has_qty = bool(product.net_quantity_value and product.net_quantity_value > 0 and product.net_quantity_unit)
    val_qty = f"{product.net_quantity_value} {product.net_quantity_unit}" if has_qty else None
    checklist.append(
        DeclarationCheckItem(
            field_name="Net Quantity",
            label_text="Net Quantity & Standard Metric Unit",
            is_present=has_qty,
            detected_value=val_qty,
            rule_description="Packaged goods must declare net quantity in standard metric units (g, kg, ml, L, N).",
            status="Declared" if has_qty else "Potentially Missing",
            guidance="Check if the weight or volume is printed clearly near the bottom or display panel."
        )
    )

    # 3. Maximum Retail Price (MRP)
    has_mrp = bool(product.mrp and product.mrp > 0)
    val_mrp = f"₹{product.mrp:.2f} (Incl. of all taxes)" if has_mrp else None
    checklist.append(
        DeclarationCheckItem(
            field_name="Retail Sale Price (MRP)",
            label_text="Maximum Retail Price (MRP)",
            is_present=has_mrp,
            detected_value=val_mrp,
            rule_description="Must be declared as 'Maximum Retail Price' or 'MRP' inclusive of all taxes.",
            status="Declared" if has_mrp else "Potentially Missing",
            guidance="Ensure the retailer does not charge above the printed MRP."
        )
    )

    # 4. Date Declarations (Mfg / Pkg / Expiry / Best Before)
    has_dates = bool(product.mfg_date or product.expiry_date or product.best_before_text)
    detected_dates = []
    if product.mfg_date:
        detected_dates.append(f"Mfg: {product.mfg_date}")
    if product.expiry_date:
        detected_dates.append(f"Exp: {product.expiry_date}")
    if product.best_before_text:
        detected_dates.append(f"Best Before: {product.best_before_text}")
    val_dates = " | ".join(detected_dates) if detected_dates else None

    checklist.append(
        DeclarationCheckItem(
            field_name="Date Information",
            label_text="Date of Manufacture / Packaging & Expiry / Best Before",
            is_present=has_dates,
            detected_value=val_dates,
            rule_description="Packaged food must specify the date of manufacture or packaging and expiry or best-before period.",
            status="Declared" if has_dates else "Potentially Missing",
            guidance="Check the seal, rim, or back of pack for embossed or inkjet-printed date stamps."
        )
    )

    # 5. Manufacturer / Packer Details
    has_mfg = bool(product.manufacturer_name or product.manufacturer_address)
    val_mfg = f"{product.manufacturer_name or ''} {product.manufacturer_address or ''}".strip()
    checklist.append(
        DeclarationCheckItem(
            field_name="Manufacturer / Packer Details",
            label_text="Name and Address of Manufacturer or Packer",
            is_present=has_mfg,
            detected_value=val_mfg if has_mfg else None,
            rule_description="The name and complete physical address of the manufacturer, packer, or marketer must be declared.",
            status="Declared" if has_mfg else "Potentially Missing",
            guidance="Look for 'Manufactured by' or 'Packed by' followed by postal address and PIN code."
        )
    )

    # 6. Consumer Care Contact Details
    has_care = bool(product.consumer_care_details and len(product.consumer_care_details.strip()) > 3)
    checklist.append(
        DeclarationCheckItem(
            field_name="Consumer Care Information",
            label_text="Consumer Helpline / Email / Grievance Address",
            is_present=has_care,
            detected_value=product.consumer_care_details if has_care else None,
            rule_description="Packages must provide consumer care telephone number, email, or contact address for complaints.",
            status="Declared" if has_care else "Potentially Missing",
            guidance="Usually printed in small print on the back or side panel with a customer care phone or email."
        )
    )

    # 7. Country of Origin
    has_origin = bool(product.country_of_origin and len(product.country_of_origin.strip()) > 1)
    checklist.append(
        DeclarationCheckItem(
            field_name="Country of Origin",
            label_text="Country of Origin Declaration",
            is_present=has_origin,
            detected_value=product.country_of_origin if has_origin else None,
            rule_description="Mandatory for pre-packaged commodities to state the country where manufactured or assembled.",
            status="Declared" if has_origin else "Potentially Missing",
            guidance="Check for 'Country of Origin: India' or foreign origin statement."
        )
    )

    return checklist
