/*
    Project: NovaTrade Sales & Inventory Analytics Platform
    Phase: 04 - Data Warehouse
    Script: 04_load_dimensions.sql
    Purpose: Populate dimension tables
*/

USE NovaTrade_DW;
GO

-- =============================================
-- DIM DATE
-- =============================================

TRUNCATE TABLE dim.DimDate;
GO

DECLARE @StartDate DATE = '2020-01-01';
DECLARE @EndDate   DATE = '2030-12-31';

WHILE @StartDate <= @EndDate
BEGIN

    INSERT INTO dim.DimDate
    (
        DateKey,
        FullDate,
        DayNumber,
        DayName,
        WeekNumber,
        MonthNumber,
        MonthName,
        QuarterNumber,
        QuarterName,
        YearNumber,
        YearMonth,
        IsWeekend,
        IsHoliday,
        HolidayName
    )
    VALUES
    (
        CAST(CONVERT(VARCHAR(8), @StartDate, 112) AS INT),
        @StartDate,
        DAY(@StartDate),
        DATENAME(WEEKDAY, @StartDate),
        DATEPART(WEEK, @StartDate),
        MONTH(@StartDate),
        DATENAME(MONTH, @StartDate),
        DATEPART(QUARTER, @StartDate),
        CONCAT('Q', DATEPART(QUARTER, @StartDate)),
        YEAR(@StartDate),
        FORMAT(@StartDate, 'yyyy-MM'),
        CASE
            WHEN DATENAME(WEEKDAY,@StartDate) IN ('Saturday','Sunday')
            THEN 1 ELSE 0
        END,
        0,
        NULL
    );

    SET @StartDate = DATEADD(DAY,1,@StartDate);

END
GO

-- =============================================
-- DIM PRODUCT
-- =============================================

TRUNCATE TABLE dim.DimProduct;
GO

INSERT INTO dim.DimProduct
(
    ProductID,
    SKU,
    ProductName,
    CategoryID,
    CategoryName,
    ModelNumber,
    Specification,
    PackageQty,
    BasePrice,
    IsActive
)
SELECT
    p.ProductID,
    p.SKU,
    p.ProductName,
    p.CategoryID,
    pc.CategoryName,
    p.ModelNumber,
    p.Specification,
    p.PackageQty,
    p.BasePrice,
    p.IsActive
FROM NovaTrade_OLTP.dbo.Product p
LEFT JOIN NovaTrade_OLTP.dbo.ProductCategory pc
    ON p.CategoryID = pc.CategoryID;
GO

-- =============================================
-- DIM BRANCH
-- =============================================

TRUNCATE TABLE dim.DimBranch;
GO

INSERT INTO dim.DimBranch
(
    BranchID,
    BranchName,
    City,
    State,
    RegionID,
    RegionName,
    IsHeadBranch,
    IsActive
)
SELECT
    b.BranchID,
    b.BranchName,
    b.City,
    b.State,
    b.RegionID,
    r.RegionName,
    b.IsHeadBranch,
    b.IsActive
FROM NovaTrade_OLTP.dbo.Branch b
LEFT JOIN NovaTrade_OLTP.dbo.Region r
    ON b.RegionID = r.RegionID;
GO

-- =============================================
-- DIM GODOWN
-- =============================================

TRUNCATE TABLE dim.DimGodown;
GO

INSERT INTO dim.DimGodown
(
    GodownID,
    GodownName,
    BranchID,
    BranchName,
    City,
    State,
    IsMainGodown,
    IsActive
)
SELECT
    g.GodownID,
    g.GodownName,
    g.BranchID,
    b.BranchName,
    g.City,
    g.State,
    g.IsMainGodown,
    g.IsActive
FROM NovaTrade_OLTP.dbo.Godown g
LEFT JOIN NovaTrade_OLTP.dbo.Branch b
    ON g.BranchID = b.BranchID;
GO

-- =============================================
-- DIM SALES HEAD
-- =============================================

TRUNCATE TABLE dim.DimSalesHead;
GO

INSERT INTO dim.DimSalesHead
(
    SalesHeadID,
    SalesHeadName,
    HomeBranchID,
    HomeBranchName,
    BaseRegionName,
    IsActive
)
SELECT
    sh.SalesHeadID,
    sh.SalesHeadName,
    sh.HomeBranchID,
    b.BranchName,
    sh.RegionName,
    sh.IsActive
FROM NovaTrade_OLTP.dbo.SalesHead sh
LEFT JOIN NovaTrade_OLTP.dbo.Branch b
    ON sh.HomeBranchID = b.BranchID;
GO

-- =============================================
-- DIM DISTRIBUTOR
-- =============================================

TRUNCATE TABLE dim.DimDistributor;
GO

INSERT INTO dim.DimDistributor
(
    DistributorID,
    DistributorName,
    City,
    StateName,
    PhysicalBranchID,
    PhysicalBranchName,
    PhysicalRegionName,
    AssignedSalesHeadID,
    AssignedSalesHeadName,
    AssignedSalesHeadBranch,
    AssignedSalesHeadBaseRegion,
    CreditLimit,
    ActivityTier,
    IsActive
)
SELECT
    d.DistributorID,
    d.DistributorName,
    d.City,
    d.State,

    b.BranchID,
    b.BranchName,
    r.RegionName,

    sh.SalesHeadID,
    sh.SalesHeadName,

    hb.BranchName,
    sh.RegionName,

    d.CreditLimit,
    d.ActivityTier,
    d.IsActive

FROM NovaTrade_OLTP.dbo.Distributor d

LEFT JOIN NovaTrade_OLTP.dbo.Branch b
    ON d.RegionBranchID = b.BranchID

LEFT JOIN NovaTrade_OLTP.dbo.Region r
    ON b.RegionID = r.RegionID

LEFT JOIN NovaTrade_OLTP.dbo.DistributorSalesHeadAssignment a
    ON d.DistributorID = a.DistributorID
    AND a.IsActive = 1

LEFT JOIN NovaTrade_OLTP.dbo.SalesHead sh
    ON a.SalesHeadID = sh.SalesHeadID

LEFT JOIN NovaTrade_OLTP.dbo.Branch hb
    ON sh.HomeBranchID = hb.BranchID;
GO

-- =============================================
-- VALIDATION
-- =============================================

SELECT 'DimDate' AS TableName, COUNT(*) AS TotalRows FROM dim.DimDate
UNION ALL
SELECT 'DimProduct', COUNT(*) FROM dim.DimProduct
UNION ALL
SELECT 'DimBranch', COUNT(*) FROM dim.DimBranch
UNION ALL
SELECT 'DimGodown', COUNT(*) FROM dim.DimGodown
UNION ALL
SELECT 'DimSalesHead', COUNT(*) FROM dim.DimSalesHead
UNION ALL
SELECT 'DimDistributor', COUNT(*) FROM dim.DimDistributor;
GO

USE NovaTrade_DW;
GO

TRUNCATE TABLE fact.FactSales;
GO

INSERT INTO fact.FactSales
(
    SalesOrderID,
    SalesOrderItemID,
    OrderNumber,
    OrderDateKey,
    ProductKey,
    DistributorKey,
    SalesHeadKey,
    BranchKey,
    FulfillmentGodownKey,
    Quantity,
    UnitPrice,
    DiscountPercent,
    LineTotal,
    OrderStatus,
    IsCrossRegionSale,
    IsOutsideAssignedSalesHead
)
SELECT
    so.SalesOrderID,
    soi.SalesOrderItemID,
    so.OrderNumber,

    dd.DateKey,
    dp.ProductKey,
    ddist.DistributorKey,
    dsh.SalesHeadKey,
    db.BranchKey,
    dg.GodownKey,

    soi.Quantity,
    soi.UnitPrice,
    soi.DiscountPercent,
    soi.LineTotal,
    so.OrderStatus,
    so.IsCrossRegionSale,

    CASE
        WHEN ddist.AssignedSalesHeadID IS NOT NULL
         AND ddist.AssignedSalesHeadID <> so.SalesHeadID
        THEN 1 ELSE 0
    END AS IsOutsideAssignedSalesHead

FROM NovaTrade_OLTP.dbo.SalesOrder so
JOIN NovaTrade_OLTP.dbo.SalesOrderItem soi
    ON so.SalesOrderID = soi.SalesOrderID

JOIN dim.DimDate dd
    ON so.OrderDate = dd.FullDate

JOIN dim.DimProduct dp
    ON soi.ProductID = dp.ProductID

JOIN dim.DimDistributor ddist
    ON so.DistributorID = ddist.DistributorID

JOIN dim.DimSalesHead dsh
    ON so.SalesHeadID = dsh.SalesHeadID

LEFT JOIN dim.DimBranch db
    ON so.SalesBranchID = db.BranchID

LEFT JOIN dim.DimGodown dg
    ON so.FulfillmentGodownID = dg.GodownID;
GO

/*
    Project: NovaTrade Sales & Inventory Analytics Platform
    Phase: 04 - Data Warehouse
    Script: 05_load_facts.sql
    Purpose: Populate fact tables
*/

USE NovaTrade_DW;
GO

-- =============================================
-- FACT SALES
-- =============================================

TRUNCATE TABLE fact.FactSales;
GO

INSERT INTO fact.FactSales
(
    SalesOrderID,
    SalesOrderItemID,
    OrderNumber,
    OrderDateKey,
    ProductKey,
    DistributorKey,
    SalesHeadKey,
    BranchKey,
    FulfillmentGodownKey,
    Quantity,
    UnitPrice,
    DiscountPercent,
    LineTotal,
    OrderStatus,
    IsCrossRegionSale,
    IsOutsideAssignedSalesHead
)
SELECT
    so.SalesOrderID,
    soi.SalesOrderItemID,
    so.OrderNumber,

    dd.DateKey,
    dp.ProductKey,
    ddist.DistributorKey,
    dsh.SalesHeadKey,
    db.BranchKey,
    dg.GodownKey,

    soi.Quantity,
    soi.UnitPrice,
    soi.DiscountPercent,
    soi.LineTotal,
    so.OrderStatus,
    so.IsCrossRegionSale,

    CASE
        WHEN ddist.AssignedSalesHeadID IS NOT NULL
         AND ddist.AssignedSalesHeadID <> so.SalesHeadID
        THEN 1 ELSE 0
    END AS IsOutsideAssignedSalesHead

FROM NovaTrade_OLTP.dbo.SalesOrder so
JOIN NovaTrade_OLTP.dbo.SalesOrderItem soi
    ON so.SalesOrderID = soi.SalesOrderID

JOIN dim.DimDate dd
    ON so.OrderDate = dd.FullDate

JOIN dim.DimProduct dp
    ON soi.ProductID = dp.ProductID

JOIN dim.DimDistributor ddist
    ON so.DistributorID = ddist.DistributorID

JOIN dim.DimSalesHead dsh
    ON so.SalesHeadID = dsh.SalesHeadID

LEFT JOIN dim.DimBranch db
    ON so.SalesBranchID = db.BranchID

LEFT JOIN dim.DimGodown dg
    ON so.FulfillmentGodownID = dg.GodownID;
GO

-- =============================================
-- FACT INVENTORY MOVEMENT
-- =============================================

USE NovaTrade_DW;
GO

TRUNCATE TABLE fact.FactInventoryMovement;
GO

INSERT INTO fact.FactInventoryMovement
(
    MovementID,
    MovementDateKey,
    ProductKey,
    FromGodownKey,
    ToGodownKey,
    FromGodownID,
    ToGodownID,
    MovementType,
    Quantity,
    InwardQuantity,
    OutwardQuantity,
    TransferQuantity,
    ReferenceID
)
SELECT
    im.MovementID,
    dd.DateKey AS MovementDateKey,
    dp.ProductKey,

    fg.GodownKey AS FromGodownKey,
    tg.GodownKey AS ToGodownKey,

    im.FromGodownID,
    im.ToGodownID,

    im.MovementType,
    im.Quantity,

    CASE 
        WHEN im.MovementType = 'INWARD' THEN im.Quantity 
        ELSE 0 
    END AS InwardQuantity,

    CASE 
        WHEN im.MovementType = 'OUTWARD' THEN im.Quantity 
        ELSE 0 
    END AS OutwardQuantity,

    CASE 
        WHEN im.MovementType = 'TRANSFER' THEN im.Quantity 
        ELSE 0 
    END AS TransferQuantity,

    im.ReferenceID
FROM NovaTrade_OLTP.dbo.InventoryMovement im
INNER JOIN dim.DimDate dd
    ON CAST(im.MovementDate AS DATE) = dd.FullDate
INNER JOIN dim.DimProduct dp
    ON im.ProductID = dp.ProductID
LEFT JOIN dim.DimGodown fg
    ON im.FromGodownID = fg.GodownID
LEFT JOIN dim.DimGodown tg
    ON im.ToGodownID = tg.GodownID;
GO
-- =============================================
-- VALIDATION
-- =============================================

SELECT 'FactSales' AS TableName, COUNT(*) AS TotalRows FROM fact.FactSales
UNION ALL
SELECT 'FactInventoryMovement', COUNT(*) FROM fact.FactInventoryMovement;
GO
