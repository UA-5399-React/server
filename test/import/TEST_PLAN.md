# Test Plan — POST /admin/products/import (#363)

## Endpoint

```
POST /admin/products/import
Content-Type: multipart/form-data
Auth: cookie (JWT)
```

## How to run

### Automated (all checks at once)

```bash
# 1. Start the server
pnpm run start:dev

# 2. In a second terminal
bash test/import/run-tests.sh
# or with a custom base URL:
bash test/import/run-tests.sh http://localhost:3001
```

### Manual (Swagger UI)

Open `http://localhost:3001/api` → section **Admin / Products** → `POST /admin/products/import`

1. Click **Authorize** → log in as `admin@admin.com / admin123`
2. Click **Try it out**
3. Upload one of the test files from `test/import/data/`

### Manual (curl)

```bash
# Login
curl -s -c /tmp/cookies.txt -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}'

# Import
curl -s -b /tmp/cookies.txt -X POST http://localhost:3001/admin/products/import \
  -F "file=@test/import/data/02-mixed-valid-invalid.csv;type=text/csv" | python3 -m json.tool
```

---

## Test files

| File                          | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `01-all-valid.csv`            | 4 rows, all valid — expect `imported:4, failed:[]` |
| `02-mixed-valid-invalid.csv`  | 9 rows — 4 valid, 5 invalid (various error types)  |
| `03-all-invalid.csv`          | 5 rows — all fail validation                       |
| `04-empty-headers-only.csv`   | Only header row — expect `imported:0, failed:[]`   |
| `05-wrong-format.txt`         | Wrong extension — expect HTTP 400                  |
| `06-all-valid.xlsx`           | 4 rows, all valid — expect `imported:4, failed:[]` |
| `07-mixed-valid-invalid.xlsx` | 7 rows — 3 valid, 4 invalid                        |

---

## Test cases

### TC-01 — No authentication

- **File:** any
- **Auth:** none
- **Expected:** `HTTP 401`
- **Check:** response body has `statusCode: 401`

### TC-02 — Customer role (forbidden)

- **File:** `01-all-valid.csv`
- **Auth:** `customer@test.com / customer123`
- **Expected:** `HTTP 403`
- **Check:** response body has `statusCode: 403`, message `"Access denied"`

### TC-03 — Unsupported file format

- **File:** `05-wrong-format.txt`
- **Auth:** admin
- **Expected:** `HTTP 400`
- **Check:**
  - `statusCode: 400`
  - `message` contains `"Unsupported file format"`
  - `message` mentions `".txt"`

### TC-04 — No file attached

- **File:** none (send request with empty body)
- **Auth:** admin
- **Expected:** non-500 response (400 or similar)
- **Check:** server does not crash

### TC-05 — CSV: all valid rows

- **File:** `01-all-valid.csv`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 4`
  - `failed: []`
  - All 4 product titles visible via `GET /products`

### TC-06 — CSV: mixed valid/invalid rows

- **File:** `02-mixed-valid-invalid.csv`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 4`
  - `failed` has 5 entries
  - Row numbers in `failed`: `3, 6, 7, 8, 10`
  - `failed[0]` — row 3 — reason mentions `"title"`
  - `failed[1]` — row 6 — reason mentions `"price"`
  - `failed[2]` — row 7 — reason mentions `"status"`
  - `failed[3]` — row 8 — reason mentions `"status"` and `"published"`
  - `failed[4]` — row 10 — reason mentions `"price"`

### TC-07 — CSV: all rows invalid

- **File:** `03-all-invalid.csv`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 0`
  - `failed` has 5 entries (rows 2–6)

### TC-08 — CSV: empty file (headers only)

- **File:** `04-empty-headers-only.csv`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 0`
  - `failed: []`

### TC-09 — XLSX: all valid rows

- **File:** `06-all-valid.xlsx`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 4`
  - `failed: []`
  - Product `"XLSX Widget Alpha"` exists via `GET /products`

### TC-10 — XLSX: mixed valid/invalid rows

- **File:** `07-mixed-valid-invalid.xlsx`
- **Auth:** admin
- **Expected:** `HTTP 200`
- **Check:**
  - `imported: 3`
  - `failed` has 4 entries
  - Row numbers in `failed`: `3, 5, 6, 7`

### TC-11 — Row numbering is 1-based with header offset

- **File:** `02-mixed-valid-invalid.csv`
- **Auth:** admin
- **Check:**
  - Header = row 1; first data row = row 2
  - Invalid first data row (row 2 in data = row 3 total) appears as `row: 3`

### TC-12 — Validation: missing title

- **Inline CSV:**
  ```
  title,price,status
  ,10.00,active
  ```
- **Check:** `failed[0].reason` mentions `"title"`

### TC-13 — Validation: non-numeric price

- **Inline CSV:**
  ```
  title,price,status
  Product A,notanumber,active
  ```
- **Check:** `failed[0].reason` mentions `"price"`

### TC-14 — Validation: negative price

- **Inline CSV:**
  ```
  title,price,status
  Product A,-5,active
  ```
- **Check:** `failed[0].reason` mentions `"price"`

### TC-15 — Validation: price = 0 is accepted

- **Inline CSV:**
  ```
  title,price,status
  Free Product,0,draft
  ```
- **Check:** `imported: 1`, `failed: []`

### TC-16 — Validation: invalid status value

- **Inline CSV:**
  ```
  title,price,status
  Product A,10.00,published
  ```
- **Check:** `failed[0].reason` mentions `"published"` and lists valid values

### TC-17 — Validation: all three valid statuses accepted

- Test each of `active`, `inactive`, `draft` individually
- **Check:** each results in `imported: 1`

### TC-18 — Products are actually persisted

- Import `01-all-valid.csv` (or `06-all-valid.xlsx`)
- Query `GET /products?search=Widget Alpha&status=active`
- **Check:** product appears in results with correct `price` and `status`

### TC-19 — productCode is auto-generated

- Import any valid row
- Fetch the created product
- **Check:** `productCode` field is populated (7-digit zero-padded number)

---

## Validation rules reference

| Field         | Required | Rule                                  |
| ------------- | -------- | ------------------------------------- |
| `title`       | Yes      | Non-empty string                      |
| `price`       | Yes      | Parseable number, `>= 0`              |
| `status`      | Yes      | One of: `active`, `inactive`, `draft` |
| `description` | No       | Passed through if present             |
| `imageUrl`    | No       | Passed through if present             |

---

## Expected response shape

```json
{
  "imported": 3,
  "failed": [
    { "row": 4, "reason": "Missing required field: price" },
    { "row": 7, "reason": "Invalid status \"published\". Allowed: active, inactive, draft" }
  ]
}
```
