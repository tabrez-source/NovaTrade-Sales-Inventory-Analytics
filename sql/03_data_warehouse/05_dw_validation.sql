USE NovaTrade_DW;
GO

-- =====================================
-- DIMENSIONS
-- =====================================

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
SELECT 'DimDistributor', COUNT(*) FROM dim.DimDistributor
UNION ALL
SELECT 'FactSales', COUNT(*) FROM fact.FactSales
UNION ALL
SELECT 'FactInventoryMovement', COUNT(*) FROM fact.FactInventoryMovement;
GO

-- =====================================
-- SALES RECONCILIATION
-- =====================================

SELECT
    SUM(LineTotal) AS DW_TotalSales
FROM fact.FactSales;
GO

SELECT
    SUM(TotalAmount) AS OLTP_TotalSales
FROM NovaTrade_OLTP.dbo.SalesOrder;
GO

-- =====================================
-- TOP PRODUCTS
-- =====================================

SELECT TOP 10
    dp.ProductName,
    SUM(fs.Quantity) AS TotalQty,
    SUM(fs.LineTotal) AS SalesAmount
FROM fact.FactSales fs
JOIN dim.DimProduct dp
    ON fs.ProductKey = dp.ProductKey
GROUP BY dp.ProductName
ORDER BY SalesAmount DESC;
GO

-- =====================================
-- SALES HEAD PERFORMANCE
-- =====================================

SELECT
    dsh.SalesHeadName,
    SUM(fs.LineTotal) AS TotalSales
FROM fact.FactSales fs
JOIN dim.DimSalesHead dsh
    ON fs.SalesHeadKey = dsh.SalesHeadKey
GROUP BY dsh.SalesHeadName
ORDER BY TotalSales DESC;
GO

-- =====================================
-- CROSS REGION SALES
-- =====================================

SELECT
    IsCrossRegionSale,
    COUNT(*) AS OrderLines,
    SUM(LineTotal) AS TotalSales
FROM fact.FactSales
GROUP BY IsCrossRegionSale;
GO

-- =====================================
-- INVENTORY MOVEMENTS
-- =====================================

SELECT
    MovementType,
    COUNT(*) AS TotalRows,
    SUM(Quantity) AS TotalQuantity
FROM fact.FactInventoryMovement
GROUP BY MovementType;
GO