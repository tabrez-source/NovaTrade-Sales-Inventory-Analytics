# Phase 2: SQL Server Staging

## Objective

The objective of this phase was to create a raw staging layer in SQL Server and load generated data into staging tables.

The staging layer stores raw imported data before it is cleaned and transformed into OLTP and Data Warehouse structures.

## Database

```text
NovaTrade_Staging
```

## Schema

```text
stg
```

## SQL Scripts

```text
sql/01_staging/
├── 01_create_database.sql
├── 02_create_schemas.sql
├── 03_create_staging_tables.sql
├── 04_bulk_insert_data.sql
└── 05_data_validation.sql
```

## Execution Flow

```text
Create Database
    ↓
Create Schema
    ↓
Create Raw Staging Tables
    ↓
Load TSV Files Using BULK INSERT
    ↓
Run Data Validation
```

## Work Completed

- Created SQL Server staging database
- Created `stg` schema
- Created raw staging tables
- Loaded large TSV files using `BULK INSERT`
- Validated loaded data

## Validation Checks

- Row count checks
- Duplicate checks
- Blank value checks
- Basic business distribution checks
- Data load verification

## Why Staging Is Important

The staging layer is used to:

- Keep raw imported data separate
- Debug data load issues
- Validate data before transformation
- Support clean downstream modeling

## Learning Outcome

This phase helped build understanding of:

- SQL Server staging design
- Schema-based organization
- Bulk data loading
- Data validation
- ETL workflow structure

## Outcome

A reliable raw data layer was established for downstream OLTP processing, Data Warehouse modeling, and future Power BI reporting.