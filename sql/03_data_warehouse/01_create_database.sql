/*
    Project: NovaTrade Sales & Inventory Analytics Platform
    Phase: 04 - Data Warehouse
    Script: 01_create_database.sql
    Purpose: Create NovaTrade_DW database
*/

IF DB_ID('NovaTrade_DW') IS NULL
BEGIN
    CREATE DATABASE NovaTrade_DW;
END
GO