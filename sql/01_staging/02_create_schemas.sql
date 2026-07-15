-- =============================================
-- Project: Akari Sales & Inventory Analytics
-- Phase: 02 - SQL Server Staging
-- Script: 02_create_schemas.sql
-- Purpose: Create schemas for staging layer
-- =============================================

USE NovaTrade_Staging;
GO

IF NOT EXISTS (
    SELECT 1 
    FROM sys.schemas 
    WHERE name = 'stg'
)
BEGIN
    EXEC('CREATE SCHEMA stg');
END
GO