"use client";

import React from "react";
import ItemsPageTemplate from "@/components/commonComp/ItemsPageTemplate";

export default function SalesItemsPage() {
    return (
        <ItemsPageTemplate
            heading="Sales Items"
            subheading="Create and manage sale item details"
            category="SALES"
            from="sales"
        />
    );
}
