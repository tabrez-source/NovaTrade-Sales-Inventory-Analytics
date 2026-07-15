/*
    Project: NovaTrade Sales & Inventory Analytics Platform
    Phase: 04 - Data Warehouse
    Script: 03_create_dw_tables.sql
    Purpose: Create dimension and fact tables
*/

USE NovaTrade_DW;
GO

-- =========================
-- DIMENSIONS
-- =========================

CREATE TABLE dim.DimDate
(
    DateKey INT NOT NULL PRIMARY KEY,
    FullDate DATE NOT NULL,
    DayNumber INT NOT NULL,
    DayName NVARCHAR(20) NOT NULL,
    WeekNumber INT NOT NULL,
    MonthNumber INT NOT NULL,
    MonthName NVARCHAR(20) NOT NULL,
    QuarterNumber INT NOT NULL,
    QuarterName NVARCHAR(10) NOT NULL,
    YearNumber INT NOT NULL,
    YearMonth NVARCHAR(7) NOT NULL,
    IsWeekend BIT NOT NULL DEFAULT 0,
    IsHoliday BIT NOT NULL DEFAULT 0,
    HolidayName NVARCHAR(100) NULL
);
GO

CREATE TABLE dim.DimProduct
(
    ProductKey INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    SKU NVARCHAR(50) NOT NULL,
    ProductName NVARCHAR(200) NOT NULL,
    CategoryID INT NULL,
    CategoryName NVARCHAR(100) NULL,
    ModelNumber NVARCHAR(100) NULL,
    Specification NVARCHAR(500) NULL,
    PackageQty INT NULL,
    BasePrice DECIMAL(18,2) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE dim.DimBranch
(
    BranchKey INT IDENTITY(1,1) PRIMARY KEY,
    BranchID INT NOT NULL,
    BranchName NVARCHAR(100) NOT NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,
    RegionID INT NULL,
    RegionName NVARCHAR(50) NULL,
    IsHeadBranch BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE dim.DimGodown
(
    GodownKey INT IDENTITY(1,1) PRIMARY KEY,
    GodownID INT NOT NULL,
    GodownName NVARCHAR(100) NOT NULL,
    BranchID INT NOT NULL,
    BranchName NVARCHAR(100) NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,
    IsMainGodown BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE dim.DimSalesHead
(
    SalesHeadKey INT IDENTITY(1,1) PRIMARY KEY,
    SalesHeadID INT NOT NULL,
    SalesHeadName NVARCHAR(150) NOT NULL,
    HomeBranchID INT NOT NULL,
    HomeBranchName NVARCHAR(100) NULL,
    BaseRegionName NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE dim.DimDistributor
(
    DistributorKey INT IDENTITY(1,1) PRIMARY KEY,
    DistributorID INT NOT NULL,
    DistributorName NVARCHAR(150) NOT NULL,
    City NVARCHAR(100) NULL,
    StateName NVARCHAR(100) NULL,

    PhysicalBranchID INT NULL,
    PhysicalBranchName NVARCHAR(100) NULL,
    PhysicalRegionName NVARCHAR(50) NULL,

    AssignedSalesHeadID INT NULL,
    AssignedSalesHeadName NVARCHAR(150) NULL,
    AssignedSalesHeadBranch NVARCHAR(100) NULL,
    AssignedSalesHeadBaseRegion NVARCHAR(50) NULL,

    CreditLimit DECIMAL(18,2) NULL,
    ActivityTier NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1
);
GO

-- =========================
-- FACTS
-- =========================

CREATE TABLE fact.FactSales
(
    FactSalesKey INT IDENTITY(1,1) PRIMARY KEY,

    SalesOrderID INT NOT NULL,
    SalesOrderItemID INT NOT NULL,
    OrderNumber NVARCHAR(50) NOT NULL,

    OrderDateKey INT NOT NULL,
    ProductKey INT NOT NULL,
    DistributorKey INT NOT NULL,
    SalesHeadKey INT NOT NULL,
    BranchKey INT NULL,
    FulfillmentGodownKey INT NULL,

    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountPercent DECIMAL(5,2) NOT NULL,
    LineTotal DECIMAL(18,2) NOT NULL,
    OrderStatus NVARCHAR(50) NOT NULL,

    IsCrossRegionSale BIT NOT NULL DEFAULT 0,
    IsOutsideAssignedSalesHead BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE fact.FactInventoryMovement
(
    InventoryMovementKey INT IDENTITY(1,1) PRIMARY KEY,

    MovementID INT NOT NULL,
    MovementDateKey INT NOT NULL,
    ProductKey INT NOT NULL,

    FromGodownKey INT NULL,
    ToGodownKey INT NULL,
    FromGodownID INT NULL,
    ToGodownID INT NULL,

    MovementType NVARCHAR(50) NOT NULL,
    Quantity INT NOT NULL,

    InwardQuantity INT NOT NULL DEFAULT 0,
    OutwardQuantity INT NOT NULL DEFAULT 0,
    TransferQuantity INT NOT NULL DEFAULT 0,

    ReferenceID INT NULL
);
GO

USE NovaTrade_DW;
GO

SELECT 
    s.name AS SchemaName,
    t.name AS TableName
FROM sys.tables t
JOIN sys.schemas s
    ON t.schema_id = s.schema_id
ORDER BY s.name, t.name;