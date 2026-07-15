USE NovaTrade_Staging;
GO

EXEC sp_MSforeachtable 'TRUNCATE TABLE ?';
GO

USE NovaTrade_Staging;
GO

BULK INSERT stg.ProductCategories_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\product_categories.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Products_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\products.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Branches_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\branches.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Godowns_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\godowns.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.SalesHeads_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\sales_heads.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Distributors_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\distributors.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.ProductPriceHistory_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\product_price_history.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.PriceLists_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\price_lists.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.PriceListItems_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\price_list_items.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Schemes_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\schemes.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.SchemeSlabs_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\scheme_slabs.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.SalesOrders_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\sales_orders.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.SalesOrderItems_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\sales_order_items.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.Dispatches_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\dispatches.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.StockInward_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\stock_inward.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.StockOutward_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\stock_outward.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO

BULK INSERT stg.InventorySnapshot_Raw FROM 'C:\Projects\NovaTrade Sales & Inventory Analytics\data\sql_load\inventory_snapshot.tsv'
WITH (FIRSTROW = 2, FIELDTERMINATOR = '\t', ROWTERMINATOR = '0x0a', TABLOCK);
GO