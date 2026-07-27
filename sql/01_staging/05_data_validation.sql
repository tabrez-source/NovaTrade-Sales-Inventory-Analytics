/*
    Project: Akari Sales & Inventory Analytics Platform
    Phase: 2 - SQL Server Staging
    Script: 05_data_validation.sql
    Purpose: Validate staging data after bulk load
*/

USE NovaTrade_Staging;
GO

-- 1. Row count check
SELECT 'Products_Raw' AS TableName, COUNT(*) AS TotalRows
FROM stg.Products_Raw

UNION ALL

SELECT 'Distributors_Raw' AS TableName, COUNT(*) AS TotalRows
FROM stg.Distributors_Raw;
GO

-- 2. Duplicate ProductID check
SELECT ProductID, COUNT(*) AS DuplicateCount
FROM stg.Products_Raw
GROUP BY ProductID
HAVING COUNT(*) > 1;
GO

-- 3. Blank ProductID check
SELECT *
FROM stg.Products_Raw
WHERE ProductID IS NULL
   OR LTRIM(RTRIM(ProductID)) = '';
GO

-- 4. Product category distribution
SELECT CategoryID, COUNT(*) AS ProductCount
FROM stg.Products_Raw
GROUP BY CategoryID
ORDER BY ProductCount DESC;
GO

-- 5. Duplicate DistributorID check
SELECT DistributorID, COUNT(*) AS DuplicateCount
FROM stg.Distributors_Raw
GROUP BY DistributorID
HAVING COUNT(*) > 1;
GO

-- 6. Distributor city distribution
SELECT City, COUNT(*) AS DistributorCount
FROM stg.Distributors_Raw
GROUP BY City
ORDER BY DistributorCount DESC;
GO