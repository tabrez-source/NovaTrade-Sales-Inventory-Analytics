USE NovaTrade_OLTP;
GO

-- =========================
-- MASTER / ORG STRUCTURE
-- =========================

CREATE TABLE dbo.Region (
    RegionID INT IDENTITY(1,1) PRIMARY KEY,
    RegionName NVARCHAR(50) NOT NULL UNIQUE,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE dbo.Branch (
    BranchID INT PRIMARY KEY,
    BranchName NVARCHAR(100) NOT NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,
    RegionID INT NOT NULL,
    IsHeadBranch BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Branch_Region
    FOREIGN KEY (RegionID) REFERENCES dbo.Region(RegionID)
);

CREATE TABLE dbo.Godown (
    GodownID INT PRIMARY KEY,
    BranchID INT NOT NULL,
    GodownName NVARCHAR(100) NOT NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,
    IsMainGodown BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Godown_Branch
    FOREIGN KEY (BranchID) REFERENCES dbo.Branch(BranchID)
);

CREATE TABLE dbo.SalesHead (
    SalesHeadID INT PRIMARY KEY,
    SalesHeadName NVARCHAR(100) NOT NULL,
    HomeBranchID INT NOT NULL,
    RegionName NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_SalesHead_Branch
    FOREIGN KEY (HomeBranchID) REFERENCES dbo.Branch(BranchID)
);

-- =========================
-- DISTRIBUTORS
-- =========================

CREATE TABLE dbo.Distributor (
    DistributorID INT PRIMARY KEY,
    DistributorName NVARCHAR(150) NOT NULL,
    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,

    -- Physical/location branch, not necessarily sales ownership
    RegionBranchID INT NULL,

    CreditLimit DECIMAL(18,2) NOT NULL DEFAULT 0,
    ActivityTier NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Distributor_RegionBranch
    FOREIGN KEY (RegionBranchID) REFERENCES dbo.Branch(BranchID)
);

CREATE TABLE dbo.DistributorSalesHeadAssignment (
    AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
    DistributorID INT NOT NULL,
    SalesHeadID INT NOT NULL,
    AssignedFrom DATE NOT NULL,
    AssignedTo DATE NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Assignment_Distributor
    FOREIGN KEY (DistributorID) REFERENCES dbo.Distributor(DistributorID),

    CONSTRAINT FK_Assignment_SalesHead
    FOREIGN KEY (SalesHeadID) REFERENCES dbo.SalesHead(SalesHeadID)
);

-- =========================
-- PRODUCT MASTER
-- =========================

CREATE TABLE dbo.ProductCategory (
    CategoryID INT PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE dbo.Product (
    ProductID INT PRIMARY KEY,
    SKU NVARCHAR(50) NOT NULL UNIQUE,
    CategoryID INT NOT NULL,
    ProductName NVARCHAR(200) NOT NULL,
    ModelNumber NVARCHAR(100) NULL,
    Specification NVARCHAR(500) NULL,
    PackageQty INT NULL,
    BasePrice DECIMAL(18,2) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Product_Category
    FOREIGN KEY (CategoryID) REFERENCES dbo.ProductCategory(CategoryID)
);

CREATE TABLE dbo.ProductPriceHistory (
    PriceHistoryID INT PRIMARY KEY,
    ProductID INT NOT NULL,
    EffectiveFromDate DATE NOT NULL,
    EffectiveToDate DATE NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    PriceListBranch NVARCHAR(100) NULL,

    CONSTRAINT FK_ProductPriceHistory_Product
    FOREIGN KEY (ProductID) REFERENCES dbo.Product(ProductID)
);

-- =========================
-- PRICE LISTS / SCHEMES
-- =========================

CREATE TABLE dbo.PriceListHeader (
    PriceListID INT PRIMARY KEY,
    PriceListDate DATE NOT NULL,
    BranchID INT NOT NULL,
    BranchName NVARCHAR(100) NULL,
    Status NVARCHAR(50) NOT NULL,

    CONSTRAINT FK_PriceListHeader_Branch
    FOREIGN KEY (BranchID) REFERENCES dbo.Branch(BranchID)
);

CREATE TABLE dbo.PriceListItem (
    PriceListItemID INT PRIMARY KEY,
    PriceListID INT NOT NULL,
    ProductID INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    IsIncluded BIT NOT NULL DEFAULT 1,

    CONSTRAINT FK_PriceListItem_Header
    FOREIGN KEY (PriceListID) REFERENCES dbo.PriceListHeader(PriceListID),

    CONSTRAINT FK_PriceListItem_Product
    FOREIGN KEY (ProductID) REFERENCES dbo.Product(ProductID)
);

CREATE TABLE dbo.Scheme (
    SchemeID INT PRIMARY KEY,
    SchemeName NVARCHAR(150) NOT NULL,
    SchemeType NVARCHAR(100) NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE dbo.SchemeSlab (
    SchemeSlabID INT PRIMARY KEY,
    SchemeID INT NOT NULL,
    SlabName NVARCHAR(100) NULL,
    MinTurnover DECIMAL(18,2) NOT NULL,
    MaxTurnover DECIMAL(18,2) NULL,
    BenefitType NVARCHAR(100) NULL,
    BenefitValue DECIMAL(18,2) NULL,

    CONSTRAINT FK_SchemeSlab_Scheme
    FOREIGN KEY (SchemeID) REFERENCES dbo.Scheme(SchemeID)
);

-- =========================
-- SALES / DISPATCH / PAYMENT
-- =========================

CREATE TABLE dbo.SalesOrder (
    SalesOrderID INT PRIMARY KEY,
    OrderNumber NVARCHAR(50) NOT NULL,
    OrderDate DATE NOT NULL,
    DistributorID INT NOT NULL,
    SalesBranchID INT NULL,
    SalesHeadID INT NOT NULL,
    FulfillmentGodownID INT NULL,
    SchemeID INT NULL,
    OrderStatus NVARCHAR(50) NOT NULL,
    IsCrossRegionSale BIT NOT NULL DEFAULT 0,
    CreatedSource NVARCHAR(50) NULL,
    TotalAmount DECIMAL(18,2) NULL,
    IsCredit BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_SalesOrder_Distributor
    FOREIGN KEY (DistributorID) REFERENCES dbo.Distributor(DistributorID),

    CONSTRAINT FK_SalesOrder_SalesHead
    FOREIGN KEY (SalesHeadID) REFERENCES dbo.SalesHead(SalesHeadID),

    CONSTRAINT FK_SalesOrder_Branch
    FOREIGN KEY (SalesBranchID) REFERENCES dbo.Branch(BranchID),

    CONSTRAINT FK_SalesOrder_Godown
    FOREIGN KEY (FulfillmentGodownID) REFERENCES dbo.Godown(GodownID),

    CONSTRAINT FK_SalesOrder_Scheme
    FOREIGN KEY (SchemeID) REFERENCES dbo.Scheme(SchemeID)
);

CREATE TABLE dbo.SalesOrderItem (
    SalesOrderItemID INT PRIMARY KEY,
    SalesOrderID INT NOT NULL,
    ProductID INT NOT NULL,
    SKU NVARCHAR(50) NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(18,2) NOT NULL,
    DiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
    LineTotal DECIMAL(18,2) NOT NULL,
    IsPreOrder BIT NOT NULL DEFAULT 0,
    ExpectedStockArrivalDate DATE NULL,

    CONSTRAINT FK_SalesOrderItem_SalesOrder
    FOREIGN KEY (SalesOrderID) REFERENCES dbo.SalesOrder(SalesOrderID),

    CONSTRAINT FK_SalesOrderItem_Product
    FOREIGN KEY (ProductID) REFERENCES dbo.Product(ProductID),

    CONSTRAINT CK_SalesOrderItem_Quantity
    CHECK (Quantity > 0)
);

CREATE TABLE dbo.Dispatch (
    DispatchID INT PRIMARY KEY,
    SalesOrderID INT NOT NULL,
    GodownID INT NOT NULL,
    TransportName NVARCHAR(100) NULL,
    LRNumber NVARCHAR(100) NULL,
    BiltyNumber NVARCHAR(100) NULL,
    DispatchDate DATE NOT NULL,
    DispatchStatus NVARCHAR(50) NULL,
    ReceivedConfirmationStatus NVARCHAR(50) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Dispatch_SalesOrder
    FOREIGN KEY (SalesOrderID) REFERENCES dbo.SalesOrder(SalesOrderID),

    CONSTRAINT FK_Dispatch_Godown
    FOREIGN KEY (GodownID) REFERENCES dbo.Godown(GodownID)
);

CREATE TABLE dbo.Payment (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    SalesOrderID INT NOT NULL,
    DistributorID INT NOT NULL,
    PaymentDate DATE NOT NULL,
    AmountPaid DECIMAL(18,2) NOT NULL,
    PaymentMode NVARCHAR(50) NULL,
    ReferenceNumber NVARCHAR(100) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_Payment_SalesOrder
    FOREIGN KEY (SalesOrderID) REFERENCES dbo.SalesOrder(SalesOrderID),

    CONSTRAINT FK_Payment_Distributor
    FOREIGN KEY (DistributorID) REFERENCES dbo.Distributor(DistributorID)
);

-- =========================
-- INVENTORY
-- =========================

CREATE TABLE dbo.InventoryMovement (
    MovementID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    GodownID INT NOT NULL,
    Quantity INT NOT NULL,
    MovementType NVARCHAR(50) NOT NULL,
    ReferenceID INT NULL,
    MovementDate DATE NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_InventoryMovement_Product
    FOREIGN KEY (ProductID) REFERENCES dbo.Product(ProductID),

    CONSTRAINT FK_InventoryMovement_Godown
    FOREIGN KEY (GodownID) REFERENCES dbo.Godown(GodownID),

    CONSTRAINT CK_InventoryMovement_Quantity
    CHECK (Quantity > 0)
);
GO

USE NovaTrade_OLTP;
GO

-- Drop old InventoryMovement table if it exists
IF OBJECT_ID('dbo.InventoryMovement', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.InventoryMovement;
END
GO

-- Recreate InventoryMovement with transfer-ready design
CREATE TABLE dbo.InventoryMovement (
    MovementID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT NOT NULL,
    FromGodownID INT NULL,
    ToGodownID INT NULL,
    Quantity INT NOT NULL,
    MovementType NVARCHAR(50) NOT NULL,
    ReferenceID INT NULL,
    MovementDate DATE NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_InventoryMovement_Product
    FOREIGN KEY (ProductID) REFERENCES dbo.Product(ProductID),

    CONSTRAINT FK_InventoryMovement_FromGodown
    FOREIGN KEY (FromGodownID) REFERENCES dbo.Godown(GodownID),

    CONSTRAINT FK_InventoryMovement_ToGodown
    FOREIGN KEY (ToGodownID) REFERENCES dbo.Godown(GodownID),

    CONSTRAINT CK_InventoryMovement_Quantity
    CHECK (Quantity > 0)
);
GO
