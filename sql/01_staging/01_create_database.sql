-- =============================================
-- Project: Akari Sales & Inventory Analytics
-- Phase: 02 - SQL Server Staging
-- Script: 01_create_database.sql
-- Purpose: Create the staging database
-- =============================================

IF DB_ID('NovaTrade_Staging') IS NULL
BEGIN
    CREATE DATABASE NovaTrade_Staging;
END
GO