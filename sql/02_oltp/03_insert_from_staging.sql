USE NovaTrade_OLTP;
GO

INSERT INTO dbo.Region (RegionName)
SELECT DISTINCT LTRIM(RTRIM(Region))
FROM NovaTrade_Staging.stg.Branches_Raw
WHERE LTRIM(RTRIM(Region)) <> '';
GO

INSERT INTO dbo.Branch
(BranchID, BranchName, City, State, RegionID, IsHeadBranch, IsActive)
SELECT
    TRY_CAST(b.BranchID AS INT),
    LTRIM(RTRIM(b.BranchName)),
    LTRIM(RTRIM(b.City)),
    LTRIM(RTRIM(b.State)),
    r.RegionID,
    CASE WHEN b.IsHeadBranch IN ('1','True','TRUE') THEN 1 ELSE 0 END,
    CASE WHEN b.IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Branches_Raw b
JOIN dbo.Region r
    ON r.RegionName = LTRIM(RTRIM(b.Region));
GO

INSERT INTO dbo.Godown
(GodownID, BranchID, GodownName, City, State, IsMainGodown, IsActive)
SELECT
    TRY_CAST(GodownID AS INT),
    TRY_CAST(BranchID AS INT),
    LTRIM(RTRIM(GodownName)),
    LTRIM(RTRIM(City)),
    LTRIM(RTRIM(State)),
    CASE WHEN IsMainGodown IN ('1','True','TRUE') THEN 1 ELSE 0 END,
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Godowns_Raw;
GO

INSERT INTO dbo.SalesHead
(SalesHeadID, SalesHeadName, HomeBranchID, RegionName, IsActive)
SELECT
    TRY_CAST(SalesHeadID AS INT),
    LTRIM(RTRIM(SalesHeadName)),
    TRY_CAST(HomeBranchID AS INT),
    LTRIM(RTRIM(Region)),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.SalesHeads_Raw;
GO

INSERT INTO dbo.ProductCategory
(CategoryID, CategoryName, IsActive)
SELECT
    TRY_CAST(CategoryID AS INT),
    LTRIM(RTRIM(CategoryName)),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.ProductCategories_Raw;
GO

INSERT INTO dbo.Product
(ProductID, SKU, CategoryID, ProductName, ModelNumber, Specification, PackageQty, BasePrice, IsActive)
SELECT
    TRY_CAST(ProductID AS INT),
    LTRIM(RTRIM(SKU)),
    TRY_CAST(CategoryID AS INT),
    LTRIM(RTRIM(CategoryName + ' ' + ISNULL(ModelNumber,''))),
    LTRIM(RTRIM(ModelNumber)),
    LTRIM(RTRIM(Specification)),
    TRY_CAST(PackageQty AS INT),
    TRY_CAST(BasePrice AS DECIMAL(18,2)),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Products_Raw;
GO

INSERT INTO dbo.Distributor
(DistributorID, DistributorName, City, State, RegionBranchID, CreditLimit, ActivityTier, IsActive)
SELECT
    TRY_CAST(DistributorID AS INT),
    LTRIM(RTRIM(DistributorName)),
    LTRIM(RTRIM(City)),
    LTRIM(RTRIM(State)),
    TRY_CAST(RegionBranchID AS INT),
    TRY_CAST(CreditLimit AS DECIMAL(18,2)),
    LTRIM(RTRIM(ActivityTier)),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Distributors_Raw;
GO

INSERT INTO dbo.DistributorSalesHeadAssignment
(DistributorID, SalesHeadID, AssignedFrom, AssignedTo, IsActive)
SELECT
    TRY_CAST(DistributorID AS INT),
    TRY_CAST(AssignedSalesHeadID AS INT),
    CAST('2020-01-01' AS DATE),
    NULL,
    1
FROM NovaTrade_Staging.stg.Distributors_Raw
WHERE TRY_CAST(AssignedSalesHeadID AS INT) IS NOT NULL;
GO

USE NovaTrade_OLTP;
GO

INSERT INTO dbo.ProductCategory
(CategoryID, CategoryName, IsActive)
SELECT DISTINCT
    TRY_CAST(p.CategoryID AS INT),
    LTRIM(RTRIM(p.CategoryName)),
    1
FROM NovaTrade_Staging.stg.Products_Raw p
WHERE TRY_CAST(p.CategoryID AS INT) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.ProductCategory pc
      WHERE pc.CategoryID = TRY_CAST(p.CategoryID AS INT)
  );
GO

INSERT INTO dbo.Product
(ProductID, SKU, CategoryID, ProductName, ModelNumber, Specification, PackageQty, BasePrice, IsActive)
SELECT
    TRY_CAST(ProductID AS INT),
    LTRIM(RTRIM(SKU)),
    TRY_CAST(CategoryID AS INT),
    LTRIM(RTRIM(CategoryName + ' ' + ISNULL(ModelNumber,''))),
    LTRIM(RTRIM(ModelNumber)),
    LTRIM(RTRIM(Specification)),
    TRY_CAST(PackageQty AS INT),
    TRY_CAST(BasePrice AS DECIMAL(18,2)),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Products_Raw
WHERE TRY_CAST(ProductID AS INT) IS NOT NULL
  AND TRY_CAST(CategoryID AS INT) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.Product p
      WHERE p.ProductID = TRY_CAST(NovaTrade_Staging.stg.Products_Raw.ProductID AS INT)
  );
GO

USE NovaTrade_OLTP;
GO

/* 1. Load Scheme if missing */
INSERT INTO dbo.Scheme
(
    SchemeID, SchemeName, SchemeType, StartDate, EndDate, IsActive
)
SELECT
    TRY_CAST(SchemeID AS INT),
    LTRIM(RTRIM(SchemeName)),
    LTRIM(RTRIM(SchemeType)),
    TRY_CONVERT(DATE, StartDate),
    TRY_CONVERT(DATE, EndDate),
    CASE WHEN IsActive IN ('1','True','TRUE') THEN 1 ELSE 0 END
FROM NovaTrade_Staging.stg.Schemes_Raw s
WHERE TRY_CAST(SchemeID AS INT) IS NOT NULL
  AND TRY_CONVERT(DATE, StartDate) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Scheme x
      WHERE x.SchemeID = TRY_CAST(s.SchemeID AS INT)
  );
GO

/* 2. Load SchemeSlab if missing */
INSERT INTO dbo.SchemeSlab
(
    SchemeSlabID, SchemeID, SlabName, MinTurnover, MaxTurnover, BenefitType, BenefitValue
)
SELECT
    TRY_CAST(SchemeSlabID AS INT),
    TRY_CAST(SchemeID AS INT),
    LTRIM(RTRIM(SlabName)),
    TRY_CAST(MinTurnover AS DECIMAL(18,2)),
    TRY_CAST(MaxTurnover AS DECIMAL(18,2)),
    LTRIM(RTRIM(BenefitType)),
    TRY_CAST(BenefitValue AS DECIMAL(18,2))
FROM NovaTrade_Staging.stg.SchemeSlabs_Raw ss
WHERE TRY_CAST(SchemeSlabID AS INT) IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM dbo.Scheme s
      WHERE s.SchemeID = TRY_CAST(ss.SchemeID AS INT)
  )
  AND NOT EXISTS (
      SELECT 1 FROM dbo.SchemeSlab x
      WHERE x.SchemeSlabID = TRY_CAST(ss.SchemeSlabID AS INT)
  );
GO

/* 3. Load SalesOrder safely */
INSERT INTO dbo.SalesOrder
(
    SalesOrderID,
    OrderNumber,
    OrderDate,
    DistributorID,
    SalesBranchID,
    SalesHeadID,
    FulfillmentGodownID,
    SchemeID,
    OrderStatus,
    IsCrossRegionSale,
    CreatedSource,
    IsCredit
)
SELECT
    TRY_CAST(so.SalesOrderID AS INT),
    LTRIM(RTRIM(so.OrderNumber)),
    TRY_CONVERT(DATE, so.OrderDate),
    TRY_CAST(so.DistributorID AS INT),
    TRY_CAST(so.SalesBranchID AS INT),
    TRY_CAST(so.SalesHeadID AS INT),
    TRY_CAST(so.FulfillmentGodownID AS INT),
    TRY_CAST(so.SchemeID AS INT),
    LTRIM(RTRIM(so.OrderStatus)),
    CASE WHEN so.IsCrossRegionSale IN ('1','True','TRUE') THEN 1 ELSE 0 END,
    LTRIM(RTRIM(so.CreatedSource)),
    1
FROM NovaTrade_Staging.stg.SalesOrders_Raw so
WHERE TRY_CAST(so.SalesOrderID AS INT) IS NOT NULL
  AND TRY_CONVERT(DATE, so.OrderDate) IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Distributor d WHERE d.DistributorID = TRY_CAST(so.DistributorID AS INT))
  AND EXISTS (SELECT 1 FROM dbo.SalesHead sh WHERE sh.SalesHeadID = TRY_CAST(so.SalesHeadID AS INT))
  AND (
        so.SalesBranchID IS NULL OR so.SalesBranchID = ''
        OR EXISTS (SELECT 1 FROM dbo.Branch b WHERE b.BranchID = TRY_CAST(so.SalesBranchID AS INT))
      )
  AND (
        so.FulfillmentGodownID IS NULL OR so.FulfillmentGodownID = ''
        OR EXISTS (SELECT 1 FROM dbo.Godown g WHERE g.GodownID = TRY_CAST(so.FulfillmentGodownID AS INT))
      )
  AND (
        so.SchemeID IS NULL OR so.SchemeID = ''
        OR EXISTS (SELECT 1 FROM dbo.Scheme s WHERE s.SchemeID = TRY_CAST(so.SchemeID AS INT))
      )
  AND NOT EXISTS (
      SELECT 1 FROM dbo.SalesOrder x
      WHERE x.SalesOrderID = TRY_CAST(so.SalesOrderID AS INT)
  );
GO

/* 4. Load SalesOrderItem safely */
INSERT INTO dbo.SalesOrderItem
(
    SalesOrderItemID,
    SalesOrderID,
    ProductID,
    SKU,
    Quantity,
    UnitPrice,
    DiscountPercent,
    LineTotal,
    IsPreOrder,
    ExpectedStockArrivalDate
)
SELECT
    TRY_CAST(i.SalesOrderItemID AS INT),
    TRY_CAST(i.SalesOrderID AS INT),
    TRY_CAST(i.ProductID AS INT),
    LTRIM(RTRIM(i.SKU)),
    TRY_CAST(i.Quantity AS INT),
    TRY_CAST(i.UnitPrice AS DECIMAL(18,2)),
    TRY_CAST(i.DiscountPercent AS DECIMAL(5,2)),
    TRY_CAST(i.LineTotal AS DECIMAL(18,2)),
    CASE WHEN i.IsPreOrder IN ('1','True','TRUE') THEN 1 ELSE 0 END,
    TRY_CONVERT(DATE, i.ExpectedStockArrivalDate)
FROM NovaTrade_Staging.stg.SalesOrderItems_Raw i
WHERE TRY_CAST(i.SalesOrderItemID AS INT) IS NOT NULL
  AND TRY_CAST(i.Quantity AS INT) > 0
  AND EXISTS (SELECT 1 FROM dbo.SalesOrder so WHERE so.SalesOrderID = TRY_CAST(i.SalesOrderID AS INT))
  AND EXISTS (SELECT 1 FROM dbo.Product p WHERE p.ProductID = TRY_CAST(i.ProductID AS INT))
  AND NOT EXISTS (
      SELECT 1 FROM dbo.SalesOrderItem x
      WHERE x.SalesOrderItemID = TRY_CAST(i.SalesOrderItemID AS INT)
  );
GO

/* 5. Update order totals */
UPDATE so
SET so.TotalAmount = x.OrderTotal
FROM dbo.SalesOrder so
JOIN (
    SELECT SalesOrderID, SUM(LineTotal) AS OrderTotal
    FROM dbo.SalesOrderItem
    GROUP BY SalesOrderID
) x
ON so.SalesOrderID = x.SalesOrderID;
GO

/* 6. Load Dispatch safely */
INSERT INTO dbo.Dispatch
(
    DispatchID,
    SalesOrderID,
    GodownID,
    TransportName,
    LRNumber,
    BiltyNumber,
    DispatchDate,
    DispatchStatus,
    ReceivedConfirmationStatus
)
SELECT
    TRY_CAST(d.DispatchID AS INT),
    TRY_CAST(d.SalesOrderID AS INT),
    TRY_CAST(d.GodownID AS INT),
    LTRIM(RTRIM(d.TransportName)),
    LTRIM(RTRIM(d.LRNumber)),
    LTRIM(RTRIM(d.BiltyNumber)),
    TRY_CONVERT(DATE, d.DispatchDate),
    LTRIM(RTRIM(d.DispatchStatus)),
    LTRIM(RTRIM(d.ReceivedConfirmationStatus))
FROM NovaTrade_Staging.stg.Dispatches_Raw d
WHERE TRY_CAST(d.DispatchID AS INT) IS NOT NULL
  AND TRY_CONVERT(DATE, d.DispatchDate) IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.SalesOrder so WHERE so.SalesOrderID = TRY_CAST(d.SalesOrderID AS INT))
  AND EXISTS (SELECT 1 FROM dbo.Godown g WHERE g.GodownID = TRY_CAST(d.GodownID AS INT))
  AND NOT EXISTS (
      SELECT 1 FROM dbo.Dispatch x
      WHERE x.DispatchID = TRY_CAST(d.DispatchID AS INT)
  );
GO

/* 7. Load INWARD inventory safely */
INSERT INTO dbo.InventoryMovement
(
    ProductID,
    GodownID,
    Quantity,
    MovementType,
    ReferenceID,
    MovementDate
)
SELECT
    TRY_CAST(i.ProductID AS INT),
    TRY_CAST(i.GodownID AS INT),
    TRY_CAST(i.Quantity AS INT),
    'INWARD',
    TRY_CAST(i.InwardID AS INT),
    TRY_CONVERT(DATE, i.InwardDate)
FROM NovaTrade_Staging.stg.StockInward_Raw i
WHERE TRY_CAST(i.Quantity AS INT) > 0
  AND TRY_CONVERT(DATE, i.InwardDate) IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Product p WHERE p.ProductID = TRY_CAST(i.ProductID AS INT))
  AND EXISTS (SELECT 1 FROM dbo.Godown g WHERE g.GodownID = TRY_CAST(i.GodownID AS INT))
  AND NOT EXISTS (
      SELECT 1 FROM dbo.InventoryMovement x
      WHERE x.MovementType = 'INWARD'
        AND x.ReferenceID = TRY_CAST(i.InwardID AS INT)
  );
GO

/* 8. Load OUTWARD inventory safely */
INSERT INTO dbo.InventoryMovement
(
    ProductID,
    GodownID,
    Quantity,
    MovementType,
    ReferenceID,
    MovementDate
)
SELECT
    TRY_CAST(o.ProductID AS INT),
    TRY_CAST(o.GodownID AS INT),
    TRY_CAST(o.Quantity AS INT),
    'OUTWARD',
    TRY_CAST(o.OutwardID AS INT),
    TRY_CONVERT(DATE, o.OutwardDate)
FROM NovaTrade_Staging.stg.StockOutward_Raw o
WHERE TRY_CAST(o.Quantity AS INT) > 0
  AND TRY_CONVERT(DATE, o.OutwardDate) IS NOT NULL
  AND EXISTS (SELECT 1 FROM dbo.Product p WHERE p.ProductID = TRY_CAST(o.ProductID AS INT))
  AND EXISTS (SELECT 1 FROM dbo.Godown g WHERE g.GodownID = TRY_CAST(o.GodownID AS INT))
  AND NOT EXISTS (
      SELECT 1 FROM dbo.InventoryMovement x
      WHERE x.MovementType = 'OUTWARD'
        AND x.ReferenceID = TRY_CAST(o.OutwardID AS INT)
  );
GO

-- Reload INWARD movements
INSERT INTO dbo.InventoryMovement
(
    ProductID,
    FromGodownID,
    ToGodownID,
    Quantity,
    MovementType,
    ReferenceID,
    MovementDate
)
SELECT
    TRY_CAST(ProductID AS INT),
    NULL AS FromGodownID,
    TRY_CAST(GodownID AS INT) AS ToGodownID,
    TRY_CAST(Quantity AS INT),
    'INWARD',
    TRY_CAST(InwardID AS INT),
    TRY_CONVERT(DATE, InwardDate)
FROM NovaTrade_Staging.stg.StockInward_Raw
WHERE TRY_CAST(Quantity AS INT) > 0
  AND TRY_CONVERT(DATE, InwardDate) IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM dbo.Product p
      WHERE p.ProductID = TRY_CAST(NovaTrade_Staging.stg.StockInward_Raw.ProductID AS INT)
  )
  AND EXISTS (
      SELECT 1 FROM dbo.Godown g
      WHERE g.GodownID = TRY_CAST(NovaTrade_Staging.stg.StockInward_Raw.GodownID AS INT)
  );
GO

-- Reload OUTWARD movements
INSERT INTO dbo.InventoryMovement
(
    ProductID,
    FromGodownID,
    ToGodownID,
    Quantity,
    MovementType,
    ReferenceID,
    MovementDate
)
SELECT
    TRY_CAST(ProductID AS INT),
    TRY_CAST(GodownID AS INT) AS FromGodownID,
    NULL AS ToGodownID,
    TRY_CAST(Quantity AS INT),
    'OUTWARD',
    TRY_CAST(OutwardID AS INT),
    TRY_CONVERT(DATE, OutwardDate)
FROM NovaTrade_Staging.stg.StockOutward_Raw
WHERE TRY_CAST(Quantity AS INT) > 0
  AND TRY_CONVERT(DATE, OutwardDate) IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM dbo.Product p
      WHERE p.ProductID = TRY_CAST(NovaTrade_Staging.stg.StockOutward_Raw.ProductID AS INT)
  )
  AND EXISTS (
      SELECT 1 FROM dbo.Godown g
      WHERE g.GodownID = TRY_CAST(NovaTrade_Staging.stg.StockOutward_Raw.GodownID AS INT)
  );
GO

/* 9. Validation */
SELECT 'Scheme' AS TableName, COUNT(*) AS TotalRows FROM dbo.Scheme
UNION ALL SELECT 'SchemeSlab', COUNT(*) FROM dbo.SchemeSlab
UNION ALL SELECT 'SalesOrder', COUNT(*) FROM dbo.SalesOrder
UNION ALL SELECT 'SalesOrderItem', COUNT(*) FROM dbo.SalesOrderItem
UNION ALL SELECT 'Dispatch', COUNT(*) FROM dbo.Dispatch
UNION ALL SELECT 'InventoryMovement', COUNT(*) FROM dbo.InventoryMovement;
GO