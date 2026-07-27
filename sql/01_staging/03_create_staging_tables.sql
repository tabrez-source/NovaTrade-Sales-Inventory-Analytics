-- =============================================
-- Project: Akari Sales & Inventory Analytics
-- Phase: Staging
-- Script: 03_create_staging_tables.sql
-- =============================================

USE NovaTrade_Staging;
GO

--------------------------------------------------
-- MASTER TABLES
--------------------------------------------------

CREATE TABLE stg.ProductCategories_Raw (
    CategoryID VARCHAR(50),
    CategoryName VARCHAR(100),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.Products_Raw (
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    CategoryID VARCHAR(50),
    CategoryName VARCHAR(100),
    ModelNumber VARCHAR(100),
    Specification VARCHAR(500),
    PackageQty VARCHAR(50),
    BasePrice VARCHAR(50),
    PriceListDate VARCHAR(50),
    PriceListBranch VARCHAR(100),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.Branches_Raw (
    BranchID VARCHAR(50),
    BranchName VARCHAR(100),
    City VARCHAR(100),
    State VARCHAR(100),
    Region VARCHAR(50),
    IsHeadBranch VARCHAR(10),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.Godowns_Raw (
    GodownID VARCHAR(50),
    BranchID VARCHAR(50),
    GodownName VARCHAR(100),
    City VARCHAR(100),
    State VARCHAR(100),
    IsMainGodown VARCHAR(10),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.SalesHeads_Raw (
    SalesHeadID VARCHAR(50),
    SalesHeadName VARCHAR(100),
    HomeBranchID VARCHAR(50),
    Region VARCHAR(50),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.Distributors_Raw (
    DistributorID VARCHAR(50),
    DistributorName VARCHAR(150),
    City VARCHAR(100),
    State VARCHAR(100),
    RegionBranchID VARCHAR(50),
    AssignedSalesHeadID VARCHAR(50),
    CreditLimit VARCHAR(50),
    ActivityTier VARCHAR(50),
    IsActive VARCHAR(50)
);

--------------------------------------------------
-- PRICE & SCHEMES
--------------------------------------------------

CREATE TABLE stg.ProductPriceHistory_Raw (
    PriceHistoryID VARCHAR(50),
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    EffectiveFromDate VARCHAR(50),
    EffectiveToDate VARCHAR(50),
    UnitPrice VARCHAR(50),
    PriceListBranch VARCHAR(100)
);

CREATE TABLE stg.PriceLists_Raw (
    PriceListID VARCHAR(50),
    PriceListDate VARCHAR(50),
    BranchID VARCHAR(50),
    BranchName VARCHAR(100),
    Status VARCHAR(50)
);

CREATE TABLE stg.PriceListItems_Raw (
    PriceListItemID VARCHAR(50),
    PriceListID VARCHAR(50),
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    UnitPrice VARCHAR(50),
    IsIncluded VARCHAR(50));

CREATE TABLE stg.Schemes_Raw (
    SchemeID VARCHAR(50),
    SchemeName VARCHAR(150),
    SchemeType VARCHAR(100),
    StartDate VARCHAR(50),
    EndDate VARCHAR(50),
    IsActive VARCHAR(50)
);

CREATE TABLE stg.SchemeSlabs_Raw (
    SchemeSlabID VARCHAR(50),
    SchemeID VARCHAR(50),
    SlabName VARCHAR(100),
    MinTurnover VARCHAR(50),
    MaxTurnover VARCHAR(50),
    BenefitType VARCHAR(100),
    BenefitValue VARCHAR(50)
);

--------------------------------------------------
-- SALES
--------------------------------------------------

CREATE TABLE stg.SalesOrders_Raw (
    SalesOrderID VARCHAR(50),
    OrderNumber VARCHAR(50),
    OrderDate VARCHAR(50),
    DistributorID VARCHAR(50),
    SalesBranchID VARCHAR(50),
    SalesHeadID VARCHAR(50),
    FulfillmentGodownID VARCHAR(50),
    SchemeID VARCHAR(50),
    OrderStatus VARCHAR(50),
    IsCrossRegionSale VARCHAR(10),
    CreatedSource VARCHAR(50)
);

CREATE TABLE stg.SalesOrderItems_Raw (
    SalesOrderItemID VARCHAR(50),
    SalesOrderID VARCHAR(50),
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    Quantity VARCHAR(50),
    UnitPrice VARCHAR(50),
    DiscountPercent VARCHAR(50),
    LineTotal VARCHAR(50),
    IsPreOrder VARCHAR(10),
    ExpectedStockArrivalDate VARCHAR(50)
);

CREATE TABLE stg.Dispatches_Raw (
    DispatchID VARCHAR(50),
    SalesOrderID VARCHAR(50),
    GodownID VARCHAR(50),
    TransportName VARCHAR(100),
    LRNumber VARCHAR(100),
    BiltyNumber VARCHAR(100),
    DispatchDate VARCHAR(50),
    DispatchStatus VARCHAR(50),
    ReceivedConfirmationStatus VARCHAR(50)
);

--------------------------------------------------
-- INVENTORY
--------------------------------------------------

CREATE TABLE stg.StockInward_Raw (
    InwardID VARCHAR(50),
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    GodownID VARCHAR(50),
    Quantity VARCHAR(50),
    InwardDate VARCHAR(50),
    InwardType VARCHAR(50)
);

CREATE TABLE stg.StockOutward_Raw (
    OutwardID VARCHAR(50),
    DispatchID VARCHAR(50),
    SalesOrderID VARCHAR(50),
    ProductID VARCHAR(50),
    SKU VARCHAR(50),
    GodownID VARCHAR(50),
    Quantity VARCHAR(50),
    OutwardDate VARCHAR(50),
    OutwardType VARCHAR(50)
);

CREATE TABLE stg.InventorySnapshot_Raw (
    InventoryID VARCHAR(50),
    ProductID VARCHAR(50),
    GodownID VARCHAR(50),
    CurrentStock VARCHAR(50),
    SnapshotDate VARCHAR(50)
);

SELECT name 
FROM sys.tables
WHERE schema_id = SCHEMA_ID('stg');