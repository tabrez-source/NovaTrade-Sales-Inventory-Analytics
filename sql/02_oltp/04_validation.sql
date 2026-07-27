/*
    Project: NovaTrade Sales & Inventory Analytics Platform
    Phase: 03 - OLTP
    Script: 07_oltp_validation.sql
    Purpose: Validate OLTP data load, relationships, and core business rules
*/

USE NovaTrade_OLTP;
GO

-- =====================================================
-- 1. TABLE ROW COUNTS
-- =====================================================

SELECT 'Region' AS TableName, COUNT(*) AS TotalRows FROM dbo.Region
UNION ALL SELECT 'Branch', COUNT(*) FROM dbo.Branch
UNION ALL SELECT 'Godown', COUNT(*) FROM dbo.Godown
UNION ALL SELECT 'SalesHead', COUNT(*) FROM dbo.SalesHead
UNION ALL SELECT 'Distributor', COUNT(*) FROM dbo.Distributor
UNION ALL SELECT 'DistributorSalesHeadAssignment', COUNT(*) FROM dbo.DistributorSalesHeadAssignment
UNION ALL SELECT 'ProductCategory', COUNT(*) FROM dbo.ProductCategory
UNION ALL SELECT 'Product', COUNT(*) FROM dbo.Product
UNION ALL SELECT 'Scheme', COUNT(*) FROM dbo.Scheme
UNION ALL SELECT 'SchemeSlab', COUNT(*) FROM dbo.SchemeSlab
UNION ALL SELECT 'SalesOrder', COUNT(*) FROM dbo.SalesOrder
UNION ALL SELECT 'SalesOrderItem', COUNT(*) FROM dbo.SalesOrderItem
UNION ALL SELECT 'Dispatch', COUNT(*) FROM dbo.Dispatch
UNION ALL SELECT 'InventoryMovement', COUNT(*) FROM dbo.InventoryMovement
UNION ALL SELECT 'PriceListHeader', COUNT(*) FROM dbo.PriceListHeader
UNION ALL SELECT 'PriceListItem', COUNT(*) FROM dbo.PriceListItem
UNION ALL SELECT 'ProductPriceHistory', COUNT(*) FROM dbo.ProductPriceHistory
UNION ALL SELECT 'Payment', COUNT(*) FROM dbo.Payment;
GO

-- =====================================================
-- 2. DISTRIBUTOR ASSIGNMENT VALIDATION
-- =====================================================

SELECT 
    COUNT(*) AS DistributorsWithoutSalesHeadAssignment
FROM dbo.Distributor d
LEFT JOIN dbo.DistributorSalesHeadAssignment a
    ON d.DistributorID = a.DistributorID
WHERE a.AssignmentID IS NULL;
GO

SELECT 
    SalesHeadID,
    COUNT(*) AS AssignedDistributors
FROM dbo.DistributorSalesHeadAssignment
GROUP BY SalesHeadID
ORDER BY SalesHeadID;
GO

-- =====================================================
-- 3. SALES ORDER VALIDATION
-- =====================================================

SELECT 
    COUNT(*) AS OrdersWithoutItems
FROM dbo.SalesOrder so
LEFT JOIN dbo.SalesOrderItem soi
    ON so.SalesOrderID = soi.SalesOrderID
WHERE soi.SalesOrderItemID IS NULL;
GO

SELECT 
    COUNT(*) AS SalesOrderItemsWithoutOrder
FROM dbo.SalesOrderItem soi
LEFT JOIN dbo.SalesOrder so
    ON soi.SalesOrderID = so.SalesOrderID
WHERE so.SalesOrderID IS NULL;
GO

SELECT 
    COUNT(*) AS OrdersWithoutTotalAmount
FROM dbo.SalesOrder
WHERE TotalAmount IS NULL;
GO

SELECT 
    TOP 20
    SalesOrderID,
    OrderNumber,
    TotalAmount
FROM dbo.SalesOrder
WHERE TotalAmount IS NULL
ORDER BY SalesOrderID;
GO

-- =====================================================
-- 4. DISPATCH VALIDATION
-- =====================================================

SELECT 
    COUNT(*) AS DispatchesWithoutOrders
FROM dbo.Dispatch d
LEFT JOIN dbo.SalesOrder so
    ON d.SalesOrderID = so.SalesOrderID
WHERE so.SalesOrderID IS NULL;
GO

SELECT 
    COUNT(*) AS OrdersWithoutDispatch
FROM dbo.SalesOrder so
LEFT JOIN dbo.Dispatch d
    ON so.SalesOrderID = d.SalesOrderID
WHERE d.DispatchID IS NULL;
GO

SELECT 
    DispatchStatus,
    COUNT(*) AS TotalDispatches
FROM dbo.Dispatch
GROUP BY DispatchStatus
ORDER BY TotalDispatches DESC;
GO

-- =====================================================
-- 5. INVENTORY MOVEMENT VALIDATION
-- =====================================================

SELECT 
    MovementType,
    COUNT(*) AS TotalRows,
    SUM(Quantity) AS TotalQuantity
FROM dbo.InventoryMovement
GROUP BY MovementType;
GO

SELECT 
    COUNT(*) AS InventoryRowsWithoutProduct
FROM dbo.InventoryMovement im
LEFT JOIN dbo.Product p
    ON im.ProductID = p.ProductID
WHERE p.ProductID IS NULL;
GO

SELECT 
    COUNT(*) AS InventoryRowsWithoutGodown
FROM dbo.InventoryMovement im
LEFT JOIN dbo.Godown g
    ON im.GodownID = g.GodownID
WHERE g.GodownID IS NULL;
GO

-- =====================================================
-- 6. PRODUCT VALIDATION
-- =====================================================

SELECT 
    COUNT(*) AS ProductsWithoutCategory
FROM dbo.Product p
LEFT JOIN dbo.ProductCategory pc
    ON p.CategoryID = pc.CategoryID
WHERE pc.CategoryID IS NULL;
GO

SELECT 
    CategoryID,
    COUNT(*) AS ProductCount
FROM dbo.Product
GROUP BY CategoryID
ORDER BY CategoryID;
GO

-- =====================================================
-- 7. CROSS-REGION BUSINESS VALIDATION
-- =====================================================

SELECT 
    IsCrossRegionSale,
    COUNT(*) AS TotalOrders,
    SUM(TotalAmount) AS TotalSales
FROM dbo.SalesOrder
GROUP BY IsCrossRegionSale;
GO

SELECT 
    sh.SalesHeadName,
    b.BranchName AS SalesHeadBranch,
    d.City AS DistributorCity,
    d.State AS DistributorState,
    COUNT(*) AS TotalOrders,
    SUM(so.TotalAmount) AS TotalSales
FROM dbo.SalesOrder so
JOIN dbo.SalesHead sh
    ON so.SalesHeadID = sh.SalesHeadID
JOIN dbo.Branch b
    ON sh.HomeBranchID = b.BranchID
JOIN dbo.Distributor d
    ON so.DistributorID = d.DistributorID
GROUP BY 
    sh.SalesHeadName,
    b.BranchName,
    d.City,
    d.State
ORDER BY TotalSales DESC;
GO

-- =====================================================
-- 8. FINAL HEALTH CHECK
-- =====================================================

SELECT 
    'OLTP validation completed successfully' AS StatusMessage,
    GETDATE() AS ValidationRunTime;
GO

-- Validate
SELECT 
    MovementType,
    COUNT(*) AS TotalRows,
    SUM(Quantity) AS TotalQuantity
FROM dbo.InventoryMovement
GROUP BY MovementType;
GO

sp_help 'dbo.InventoryMovement';