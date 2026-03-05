---
name: binance-spot
version: 1.0.1
description: Binance Spot Trading API — account queries, order execution, market data, and exchange information for spot trading.
category: exchange
tags: [binance, spot, trading, market-data, order-execution]
author: fundingArb
authentication: hmac-sha256
base_urls:
  mainnet: https://api.binance.com
  testnet: https://testnet.binance.vision
user_agent: "binance-spot/1.0.1 (Skill)"
---

# Binance Spot Trading API Skill

## Overview

This skill provides complete coverage of the Binance Spot Trading API endpoints required for funding rate arbitrage. It enables agents to:

- **Query account balances**: USDT and all asset holdings in the spot wallet
- **Execute spot orders**: market and limit orders for buying and selling assets
- **Fetch market data**: order books, recent trades, ticker prices, and 24h statistics
- **Retrieve exchange rules**: symbol trading rules including LOT_SIZE, MIN_NOTIONAL, PRICE_FILTER precision requirements
- **Manage orders**: query order status, cancel open orders

All private endpoints are under the `/api/v3/` namespace and require HMAC-SHA256 signed requests.

---

## Authentication

All private endpoints require **HMAC-SHA256** request signing. The process is identical across all Binance API products.

### Requirements

| Component    | Location     | Description                                                    |
|--------------|--------------|----------------------------------------------------------------|
| X-MBX-APIKEY | HTTP Header | Your Binance API key                                           |
| timestamp    | Query string | Current UTC time in milliseconds (Unix epoch ms)               |
| signature    | Query string | HMAC-SHA256 of the full query string using your Secret Key     |
| recvWindow   | Query string | Optional. Max ms the request is valid after timestamp. Default 5000 |

### Signing Procedure

1. Construct the query string with all parameters **except** `signature`.
2. Compute HMAC-SHA256 of that query string using your **Secret Key**.
3. Append `&signature=<hex digest>` to the query string.

### Full Example

**Goal:** Query account info via `GET /api/v3/account`.

**Step 1 — Build query string:**

```
timestamp=1700000000000&recvWindow=5000
```

**Step 2 — Compute HMAC-SHA256:**

```python
import hmac
import hashlib

secret_key = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j"
query_string = "timestamp=1700000000000&recvWindow=5000"

signature = hmac.new(
    secret_key.encode("utf-8"),
    query_string.encode("utf-8"),
    hashlib.sha256
).hexdigest()
```

**Step 3 — Send signed request:**

```bash
curl -G "https://api.binance.com/api/v3/account" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "recvWindow=5000" \
  --data-urlencode "signature=<computed_signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

### Python Signing Helper

```python
import hmac
import hashlib
import time
import requests

API_KEY = "your_api_key"
SECRET_KEY = "your_secret_key"
BASE_URL = "https://api.binance.com"

def sign(params: dict) -> dict:
    """Add timestamp and HMAC-SHA256 signature to params."""
    params["timestamp"] = int(time.time() * 1000)
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    signature = hmac.new(
        SECRET_KEY.encode(), query_string.encode(), hashlib.sha256
    ).hexdigest()
    params["signature"] = signature
    return params

def headers() -> dict:
    return {"X-MBX-APIKEY": API_KEY}
```

---

## Public Endpoints

These endpoints require no authentication.

---

### GET /api/v3/ping

Test connectivity to the API server.

**Parameters:** None

**Weight:** 1

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/ping"
```

**Example Response (200 OK):**

```json
{}
```

---

### GET /api/v3/time

Get server time. Use this to synchronize your local clock for signature generation.

**Parameters:** None

**Weight:** 1

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/time"
```

**Example Response (200 OK):**

```json
{
    "serverTime": 1700000000000
}
```

---

### GET /api/v3/exchangeInfo

Exchange trading rules and symbol information. This is the authoritative source for precision, lot sizes, and minimum notional requirements.

**Weight:** 20

**Parameters:**

| Name    | Type   | Required | Description                                           |
|---------|--------|----------|-------------------------------------------------------|
| symbol  | STRING | No       | Single symbol (e.g. `BTCUSDT`)                       |
| symbols | STRING | No       | JSON array of symbols (e.g. `["BTCUSDT","ETHUSDT"]`) |

If neither parameter is sent, all symbols are returned.

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/exchangeInfo?symbol=BTCUSDT"
```

**Example Response (200 OK) — truncated to relevant fields:**

```json
{
    "timezone": "UTC",
    "serverTime": 1700000000000,
    "rateLimits": [...],
    "symbols": [
        {
            "symbol": "BTCUSDT",
            "status": "TRADING",
            "baseAsset": "BTC",
            "baseAssetPrecision": 8,
            "quoteAsset": "USDT",
            "quotePrecision": 8,
            "quoteAssetPrecision": 8,
            "orderTypes": ["LIMIT", "LIMIT_MAKER", "MARKET", "STOP_LOSS_LIMIT", "TAKE_PROFIT_LIMIT"],
            "icebergAllowed": true,
            "ocoAllowed": true,
            "isSpotTradingAllowed": true,
            "isMarginTradingAllowed": true,
            "filters": [
                {
                    "filterType": "PRICE_FILTER",
                    "minPrice": "0.01000000",
                    "maxPrice": "1000000.00000000",
                    "tickSize": "0.01000000"
                },
                {
                    "filterType": "LOT_SIZE",
                    "minQty": "0.00001000",
                    "maxQty": "9000.00000000",
                    "stepSize": "0.00001000"
                },
                {
                    "filterType": "MIN_NOTIONAL",
                    "minNotional": "5.00000000",
                    "applyToMarket": true,
                    "avgPriceMins": 5
                },
                {
                    "filterType": "NOTIONAL",
                    "minNotional": "5.00000000",
                    "applyMinToMarket": true,
                    "maxNotional": "9000000.00000000",
                    "applyMaxToMarket": false,
                    "avgPriceMins": 5
                },
                {
                    "filterType": "MARKET_LOT_SIZE",
                    "minQty": "0.00000000",
                    "maxQty": "100.00000000",
                    "stepSize": "0.00000000"
                }
            ],
            "permissions": ["SPOT", "MARGIN"]
        }
    ]
}
```

**Key Filters for Arbitrage:**

| Filter | Field | Usage |
|--------|-------|-------|
| `LOT_SIZE` | `stepSize` | Minimum quantity increment. Round order qty DOWN to nearest stepSize. |
| `LOT_SIZE` | `minQty` | Minimum order quantity. |
| `PRICE_FILTER` | `tickSize` | Minimum price increment for limit orders. |
| `MIN_NOTIONAL` | `minNotional` | Minimum order value in quote asset (USDT). `qty * price >= minNotional`. |
| `MARKET_LOT_SIZE` | `maxQty` | Maximum quantity for market orders (may differ from LOT_SIZE maxQty). |

---

### GET /api/v3/depth

Order book depth.

**Weight:** Adjusted based on limit — 5 (limit 5-100), 10 (limit 500), 50 (limit 1000), 250 (limit 5000).

**Parameters:**

| Name   | Type   | Required | Description                                        |
|--------|--------|----------|----------------------------------------------------|
| symbol | STRING | Yes      | Trading pair symbol (e.g. `BTCUSDT`)              |
| limit  | INT    | No       | Default 100. Valid: 5, 10, 20, 50, 100, 500, 1000, 5000 |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=20"
```

**Example Response (200 OK):**

```json
{
    "lastUpdateId": 1027024,
    "bids": [
        ["43250.00", "0.150"],
        ["43249.50", "0.320"],
        ["43249.00", "1.200"],
        ["43248.50", "0.500"],
        ["43248.00", "2.100"]
    ],
    "asks": [
        ["43250.50", "0.200"],
        ["43251.00", "0.450"],
        ["43251.50", "0.800"],
        ["43252.00", "1.500"],
        ["43252.50", "0.300"]
    ]
}
```

Each entry is `[price, quantity]` as strings. Bids are sorted descending (best bid first). Asks are sorted ascending (best ask first).

**Slippage Calculation for Market Buy:**

```python
def calculate_slippage(asks: list, quantity: float) -> float:
    """Calculate expected slippage for a market buy of given quantity."""
    total_filled = 0.0
    total_cost = 0.0
    for price_str, qty_str in asks:
        price = float(price_str)
        available = float(qty_str)
        fill = min(available, quantity - total_filled)
        total_cost += fill * price
        total_filled += fill
        if total_filled >= quantity:
            break
    if total_filled == 0:
        return 0
    avg_price = total_cost / total_filled
    best_ask = float(asks[0][0])
    return (avg_price - best_ask) / best_ask
```

---

### GET /api/v3/trades

Recent trades for a symbol.

**Weight:** 10

**Parameters:**

| Name   | Type   | Required | Description                           |
|--------|--------|----------|---------------------------------------|
| symbol | STRING | Yes      | Trading pair symbol                   |
| limit  | INT    | No       | Default 500. Max 1000                |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=5"
```

**Example Response (200 OK):**

```json
[
    {
        "id": 28457,
        "price": "43250.50",
        "qty": "0.023",
        "quoteQty": "994.76",
        "time": 1700000000000,
        "isBuyerMaker": false,
        "isBestMatch": true
    }
]
```

---

### GET /api/v3/klines

Candlestick/kline data.

**Weight:** 2

**Parameters:**

| Name      | Type   | Required | Description                                                          |
|-----------|--------|----------|----------------------------------------------------------------------|
| symbol    | STRING | Yes      | Trading pair symbol                                                  |
| interval  | ENUM   | Yes      | `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M` |
| startTime | LONG   | No       | Start time in ms                                                     |
| endTime   | LONG   | No       | End time in ms                                                       |
| limit     | INT    | No       | Default 500. Max 1500                                                |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=3"
```

**Example Response (200 OK):**

```json
[
    [
        1699996800000,      // Open time
        "43200.00",         // Open
        "43350.50",         // High
        "43150.00",         // Low
        "43250.00",         // Close
        "125.450",          // Volume (base asset)
        1700000399999,      // Close time
        "5425600.50",       // Quote asset volume
        312,                // Number of trades
        "62.300",           // Taker buy base asset volume
        "2694800.25",       // Taker buy quote asset volume
        "0"                 // Ignore
    ]
]
```

---

### GET /api/v3/ticker/24hr

24-hour rolling window price change statistics.

**Weight:** 2 (single symbol), 80 (all symbols)

**Parameters:**

| Name   | Type   | Required | Description                           |
|--------|--------|----------|---------------------------------------|
| symbol | STRING | No       | If omitted, returns all symbols       |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"
```

**Example Response (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "priceChange": "-152.50",
    "priceChangePercent": "-0.352",
    "weightedAvgPrice": "43125.80",
    "prevClosePrice": "43350.00",
    "lastPrice": "43197.50",
    "lastQty": "0.012",
    "bidPrice": "43197.00",
    "bidQty": "0.350",
    "askPrice": "43198.00",
    "askQty": "0.120",
    "openPrice": "43350.00",
    "highPrice": "43580.00",
    "lowPrice": "42900.00",
    "volume": "12543.120",
    "quoteVolume": "541234567.89",
    "openTime": 1699913600000,
    "closeTime": 1700000000000,
    "firstId": 28450000,
    "lastId": 28462000,
    "count": 12000
}
```

---

### GET /api/v3/ticker/price

Latest price for a symbol or all symbols.

**Weight:** 2 (single), 4 (all)

**Parameters:**

| Name   | Type   | Required | Description                     |
|--------|--------|----------|---------------------------------|
| symbol | STRING | No       | If omitted, returns all symbols |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
```

**Example Response (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "price": "43250.50000000"
}
```

---

### GET /api/v3/ticker/bookTicker

Best bid/ask price and quantity.

**Weight:** 2 (single), 4 (all)

**Parameters:**

| Name   | Type   | Required | Description                     |
|--------|--------|----------|---------------------------------|
| symbol | STRING | No       | If omitted, returns all symbols |

**Example Request:**

```bash
curl "https://api.binance.com/api/v3/ticker/bookTicker?symbol=BTCUSDT"
```

**Example Response (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "bidPrice": "43250.00",
    "bidQty": "0.350",
    "askPrice": "43250.50",
    "askQty": "0.200"
}
```

---

## Authenticated Endpoints

All endpoints below require HMAC-SHA256 signed requests with `X-MBX-APIKEY` header.

---

### GET /api/v3/account

Account information including all asset balances.

**Weight:** 20

**Parameters:**

| Name       | Type   | Required | Description                                           |
|------------|--------|----------|-------------------------------------------------------|
| recvWindow | LONG   | No       | Max ms the request is valid after timestamp. Default 5000 |
| timestamp  | LONG   | Yes      | Current UTC time in milliseconds                      |
| signature  | STRING | Yes      | HMAC-SHA256 signature                                 |

**Example Request:**

```bash
curl -G "https://api.binance.com/api/v3/account" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "recvWindow=5000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response (200 OK):**

```json
{
    "makerCommission": 10,
    "takerCommission": 10,
    "buyerCommission": 0,
    "sellerCommission": 0,
    "commissionRates": {
        "maker": "0.00100000",
        "taker": "0.00100000",
        "buyer": "0.00000000",
        "seller": "0.00000000"
    },
    "canTrade": true,
    "canWithdraw": true,
    "canDeposit": true,
    "brokered": false,
    "requireSelfTradePrevention": false,
    "preventSor": false,
    "updateTime": 1700000000000,
    "accountType": "SPOT",
    "balances": [
        {
            "asset": "BTC",
            "free": "0.45230000",
            "locked": "0.00000000"
        },
        {
            "asset": "USDT",
            "free": "15234.56000000",
            "locked": "500.00000000"
        },
        {
            "asset": "ETH",
            "free": "12.80000000",
            "locked": "0.00000000"
        },
        {
            "asset": "BNB",
            "free": "35.20000000",
            "locked": "0.00000000"
        }
    ],
    "permissions": ["SPOT"],
    "uid": 354937868
}
```

**Extracting USDT Balance for Arbitrage:**

```python
spot_usdt = next(
    (float(b["free"]) for b in response["balances"] if b["asset"] == "USDT"),
    0.0
)
```

**Fee Rate Extraction:**

```python
taker_fee = float(response["commissionRates"]["taker"])  # e.g., 0.001 = 0.1%
maker_fee = float(response["commissionRates"]["maker"])  # e.g., 0.001 = 0.1%
```

---

### POST /api/v3/order

Place a new order. This is the primary order execution endpoint.

**Weight:** 1

**Parameters:**

| Name             | Type    | Required | Description                                                             |
|------------------|---------|----------|-------------------------------------------------------------------------|
| symbol           | STRING  | Yes      | Trading pair (e.g. `BTCUSDT`)                                          |
| side             | ENUM    | Yes      | `BUY` or `SELL`                                                         |
| type             | ENUM    | Yes      | `LIMIT`, `MARKET`, `STOP_LOSS_LIMIT`, `TAKE_PROFIT_LIMIT`, `LIMIT_MAKER` |
| timeInForce      | ENUM    | Cond.    | Required for LIMIT: `GTC`, `IOC`, `FOK`                                |
| quantity         | DECIMAL | Cond.    | Order quantity in base asset. Required for LIMIT and MARKET SELL.       |
| quoteOrderQty    | DECIMAL | Cond.    | Order amount in quote asset. For MARKET BUY only.                       |
| price            | DECIMAL | Cond.    | Required for LIMIT orders.                                              |
| newClientOrderId | STRING  | No       | Custom order ID. Auto-generated if not sent.                            |
| stopPrice        | DECIMAL | Cond.    | Required for STOP_LOSS_LIMIT and TAKE_PROFIT_LIMIT.                     |
| newOrderRespType | ENUM    | No       | `ACK`, `RESULT`, or `FULL`. Default: `FULL` for MARKET, `ACK` for LIMIT. |
| recvWindow       | LONG    | No       | Default 5000                                                            |
| timestamp        | LONG    | Yes      | Current UTC time in milliseconds                                        |
| signature        | STRING  | Yes      | HMAC-SHA256 signature                                                   |

**Order Type Requirements:**

| Type               | Required Parameters                            |
|--------------------|-------------------------------------------------|
| MARKET BUY         | `quantity` OR `quoteOrderQty` (one of the two) |
| MARKET SELL        | `quantity`                                       |
| LIMIT              | `quantity`, `price`, `timeInForce`               |
| STOP_LOSS_LIMIT    | `quantity`, `price`, `stopPrice`, `timeInForce`  |
| TAKE_PROFIT_LIMIT  | `quantity`, `price`, `stopPrice`, `timeInForce`  |

**Example Request — Market BUY (for arbitrage entry):**

```bash
curl -X POST "https://api.binance.com/api/v3/order" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "side=BUY" \
  --data-urlencode "type=MARKET" \
  --data-urlencode "quantity=0.023" \
  --data-urlencode "newOrderRespType=FULL" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response — FULL (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "orderId": 28,
    "orderListId": -1,
    "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
    "transactTime": 1700000000123,
    "price": "0.00000000",
    "origQty": "0.02300000",
    "executedQty": "0.02300000",
    "cummulativeQuoteQty": "994.76150000",
    "status": "FILLED",
    "timeInForce": "GTC",
    "type": "MARKET",
    "side": "BUY",
    "workingTime": 1700000000123,
    "selfTradePreventionMode": "EXPIRE_MAKER",
    "fills": [
        {
            "price": "43250.50",
            "qty": "0.01500000",
            "commission": "0.00001500",
            "commissionAsset": "BTC",
            "tradeId": 56
        },
        {
            "price": "43251.00",
            "qty": "0.00800000",
            "commission": "0.00000800",
            "commissionAsset": "BTC",
            "tradeId": 57
        }
    ]
}
```

**Extracting Weighted Average Fill Price:**

```python
total_cost = sum(float(f["price"]) * float(f["qty"]) for f in response["fills"])
total_qty = float(response["executedQty"])
avg_price = total_cost / total_qty if total_qty > 0 else 0
```

**Example Request — Market SELL (for arbitrage exit):**

```bash
curl -X POST "https://api.binance.com/api/v3/order" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "side=SELL" \
  --data-urlencode "type=MARKET" \
  --data-urlencode "quantity=0.023" \
  --data-urlencode "newOrderRespType=FULL" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response — FULL (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "orderId": 29,
    "orderListId": -1,
    "clientOrderId": "7dCrw3kRUAF9CvJDGP17IQ",
    "transactTime": 1700086400123,
    "price": "0.00000000",
    "origQty": "0.02300000",
    "executedQty": "0.02300000",
    "cummulativeQuoteQty": "995.80500000",
    "status": "FILLED",
    "timeInForce": "GTC",
    "type": "MARKET",
    "side": "SELL",
    "workingTime": 1700086400123,
    "selfTradePreventionMode": "EXPIRE_MAKER",
    "fills": [
        {
            "price": "43296.00",
            "qty": "0.02300000",
            "commission": "0.99580500",
            "commissionAsset": "USDT",
            "tradeId": 89
        }
    ]
}
```

**Order Status Values:**

| Status           | Description                                       |
|------------------|---------------------------------------------------|
| `NEW`            | Order accepted, not yet filled                     |
| `PARTIALLY_FILLED` | Part of order quantity has been filled           |
| `FILLED`         | Entire order quantity has been filled               |
| `CANCELED`       | Order has been canceled by the user                |
| `PENDING_CANCEL` | Cancel request received (rare, usually instant)    |
| `REJECTED`       | Order was rejected (e.g., insufficient balance)    |
| `EXPIRED`        | Order expired per timeInForce rules                |
| `EXPIRED_IN_MATCH` | Order expired during matching                    |

---

### GET /api/v3/order

Query an order's status.

**Weight:** 4

**Parameters:**

| Name             | Type   | Required | Description                                     |
|------------------|--------|----------|-------------------------------------------------|
| symbol           | STRING | Yes      | Trading pair symbol                              |
| orderId          | LONG   | Cond.    | Either orderId or origClientOrderId is required |
| origClientOrderId| STRING | Cond.    | Either orderId or origClientOrderId is required |
| recvWindow       | LONG   | No       | Default 5000                                     |
| timestamp        | LONG   | Yes      | Current UTC time in milliseconds                 |
| signature        | STRING | Yes      | HMAC-SHA256 signature                            |

**Example Request:**

```bash
curl -G "https://api.binance.com/api/v3/order" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "orderId=28" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "orderId": 28,
    "orderListId": -1,
    "clientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
    "price": "0.00000000",
    "origQty": "0.02300000",
    "executedQty": "0.02300000",
    "cummulativeQuoteQty": "994.76150000",
    "status": "FILLED",
    "timeInForce": "GTC",
    "type": "MARKET",
    "side": "BUY",
    "stopPrice": "0.00000000",
    "icebergQty": "0.00000000",
    "time": 1700000000123,
    "updateTime": 1700000000123,
    "isWorking": true,
    "workingTime": 1700000000123,
    "origQuoteOrderQty": "0.00000000",
    "selfTradePreventionMode": "EXPIRE_MAKER"
}
```

---

### DELETE /api/v3/order

Cancel an open order.

**Weight:** 1

**Parameters:**

| Name             | Type   | Required | Description                                     |
|------------------|--------|----------|-------------------------------------------------|
| symbol           | STRING | Yes      | Trading pair symbol                              |
| orderId          | LONG   | Cond.    | Either orderId or origClientOrderId is required |
| origClientOrderId| STRING | Cond.    | Either orderId or origClientOrderId is required |
| recvWindow       | LONG   | No       | Default 5000                                     |
| timestamp        | LONG   | Yes      | Current UTC time in milliseconds                 |
| signature        | STRING | Yes      | HMAC-SHA256 signature                            |

**Example Request:**

```bash
curl -X DELETE "https://api.binance.com/api/v3/order" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "orderId=28" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response (200 OK):**

```json
{
    "symbol": "BTCUSDT",
    "origClientOrderId": "6gCrw2kRUAF9CvJDGP16IP",
    "orderId": 28,
    "orderListId": -1,
    "clientOrderId": "cancelMyOrder1",
    "transactTime": 1700000001000,
    "price": "43300.00",
    "origQty": "0.02300000",
    "executedQty": "0.00000000",
    "cummulativeQuoteQty": "0.00000000",
    "status": "CANCELED",
    "timeInForce": "GTC",
    "type": "LIMIT",
    "side": "BUY",
    "selfTradePreventionMode": "EXPIRE_MAKER"
}
```

---

### GET /api/v3/openOrders

Get all open orders on a symbol or all symbols.

**Weight:** 6 (single symbol), 80 (all symbols)

**Parameters:**

| Name       | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| symbol     | STRING | No       | If omitted, returns open orders on all symbols |
| recvWindow | LONG   | No       | Default 5000                                |
| timestamp  | LONG   | Yes      | Current UTC time in milliseconds            |
| signature  | STRING | Yes      | HMAC-SHA256 signature                       |

**Example Request:**

```bash
curl -G "https://api.binance.com/api/v3/openOrders" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response (200 OK):**

```json
[
    {
        "symbol": "BTCUSDT",
        "orderId": 30,
        "clientOrderId": "limitOrder1",
        "price": "42000.00",
        "origQty": "0.05000000",
        "executedQty": "0.00000000",
        "status": "NEW",
        "timeInForce": "GTC",
        "type": "LIMIT",
        "side": "BUY",
        "time": 1700000000000,
        "updateTime": 1700000000000
    }
]
```

---

### GET /api/v3/myTrades

Get trade history for a symbol.

**Weight:** 20

**Parameters:**

| Name       | Type   | Required | Description                                        |
|------------|--------|----------|----------------------------------------------------|
| symbol     | STRING | Yes      | Trading pair symbol                                 |
| orderId    | LONG   | No       | Filter by order ID                                  |
| startTime  | LONG   | No       | Start time in ms                                    |
| endTime    | LONG   | No       | End time in ms                                      |
| fromId     | LONG   | No       | Trade ID to fetch from                              |
| limit      | INT    | No       | Default 500. Max 1000                               |
| recvWindow | LONG   | No       | Default 5000                                        |
| timestamp  | LONG   | Yes      | Current UTC time in milliseconds                    |
| signature  | STRING | Yes      | HMAC-SHA256 signature                               |

**Example Request:**

```bash
curl -G "https://api.binance.com/api/v3/myTrades" \
  --data-urlencode "symbol=BTCUSDT" \
  --data-urlencode "limit=5" \
  --data-urlencode "timestamp=1700000000000" \
  --data-urlencode "signature=<signature>" \
  -H "X-MBX-APIKEY: <api_key>"
```

**Example Response (200 OK):**

```json
[
    {
        "symbol": "BTCUSDT",
        "id": 56,
        "orderId": 28,
        "orderListId": -1,
        "price": "43250.50",
        "qty": "0.01500000",
        "quoteQty": "648.76",
        "commission": "0.00001500",
        "commissionAsset": "BTC",
        "time": 1700000000123,
        "isBuyer": true,
        "isMaker": false,
        "isBestMatch": true
    }
]
```

---

## Common Patterns

### Pattern 1: Market Buy for Arbitrage Entry

```python
def spot_market_buy(symbol: str, quantity: float) -> dict:
    """Place market buy order and return fill details."""
    params = sign({
        "symbol": symbol,
        "side": "BUY",
        "type": "MARKET",
        "quantity": str(quantity),
        "newOrderRespType": "FULL"
    })
    resp = requests.post(f"{BASE_URL}/api/v3/order", params=params, headers=headers())
    resp.raise_for_status()
    data = resp.json()

    if data["status"] != "FILLED":
        raise Exception(f"Order not filled: status={data['status']}")

    # Calculate weighted average price from fills
    fills = data["fills"]
    total_cost = sum(float(f["price"]) * float(f["qty"]) for f in fills)
    total_qty = float(data["executedQty"])
    avg_price = total_cost / total_qty

    return {
        "order_id": data["orderId"],
        "avg_price": avg_price,
        "filled_qty": total_qty,
        "quote_qty": float(data["cummulativeQuoteQty"]),
        "fills": fills
    }
```

### Pattern 2: Market Sell for Arbitrage Exit

```python
def spot_market_sell(symbol: str, quantity: float) -> dict:
    """Place market sell order and return fill details."""
    params = sign({
        "symbol": symbol,
        "side": "SELL",
        "type": "MARKET",
        "quantity": str(quantity),
        "newOrderRespType": "FULL"
    })
    resp = requests.post(f"{BASE_URL}/api/v3/order", params=params, headers=headers())
    resp.raise_for_status()
    data = resp.json()

    if data["status"] != "FILLED":
        raise Exception(f"Order not filled: status={data['status']}")

    fills = data["fills"]
    total_proceeds = sum(float(f["price"]) * float(f["qty"]) for f in fills)
    total_qty = float(data["executedQty"])
    avg_price = total_proceeds / total_qty

    return {
        "order_id": data["orderId"],
        "avg_price": avg_price,
        "filled_qty": total_qty,
        "quote_qty": float(data["cummulativeQuoteQty"]),
        "fills": fills
    }
```

### Pattern 3: Get USDT Balance

```python
def get_spot_usdt_balance() -> float:
    """Fetch available USDT balance in spot wallet."""
    params = sign({})
    resp = requests.get(f"{BASE_URL}/api/v3/account", params=params, headers=headers())
    resp.raise_for_status()
    for balance in resp.json()["balances"]:
        if balance["asset"] == "USDT":
            return float(balance["free"])
    return 0.0
```

### Pattern 4: Get Symbol Trading Rules

```python
def get_symbol_rules(symbol: str) -> dict:
    """Fetch LOT_SIZE and MIN_NOTIONAL rules for a symbol."""
    resp = requests.get(f"{BASE_URL}/api/v3/exchangeInfo", params={"symbol": symbol})
    resp.raise_for_status()
    sym = resp.json()["symbols"][0]
    rules = {}
    for f in sym["filters"]:
        if f["filterType"] == "LOT_SIZE":
            rules["step_size"] = float(f["stepSize"])
            rules["min_qty"] = float(f["minQty"])
            rules["max_qty"] = float(f["maxQty"])
        elif f["filterType"] == "MIN_NOTIONAL":
            rules["min_notional"] = float(f["minNotional"])
        elif f["filterType"] == "PRICE_FILTER":
            rules["tick_size"] = float(f["tickSize"])
        elif f["filterType"] == "MARKET_LOT_SIZE":
            rules["market_max_qty"] = float(f["maxQty"])
    return rules
```

### Pattern 5: Round Quantity to Valid Step Size

```python
import math

def round_step(value: float, step_size: float) -> float:
    """Round down to nearest valid step size."""
    if step_size == 0:
        return value
    precision = max(0, len(str(step_size).rstrip('0').split('.')[-1]))
    rounded = math.floor(value / step_size) * step_size
    return round(rounded, precision)
```

---

## Error Codes

| HTTP Status | Error Code | Message                                  | Description                                               |
|-------------|------------|------------------------------------------|-----------------------------------------------------------|
| 400         | -1013      | Filter failure: LOT_SIZE                 | Quantity not valid for step size or below min              |
| 400         | -1013      | Filter failure: MIN_NOTIONAL             | Order value below minimum notional                         |
| 400         | -1013      | Filter failure: PRICE_FILTER             | Price not valid for tick size                              |
| 400         | -1015      | Too many orders                          | Order rate limit exceeded                                  |
| 400         | -1021      | Timestamp outside recvWindow             | Clock drift — sync with server time                        |
| 400         | -1022      | Signature for this request is not valid  | HMAC signature mismatch                                    |
| 400         | -1102      | Mandatory parameter missing              | A required parameter was not sent                          |
| 400         | -2010      | Account has insufficient balance         | Not enough free balance for order                          |
| 400         | -2011      | Unknown order sent                       | Order ID does not exist                                    |
| 400         | -2013      | No such order                            | Order not found for cancel                                 |
| 401         | -2015      | Invalid API-key, IP, or permissions      | Check API key, IP whitelist, and trading permissions        |
| 403         | -1003      | WAI:too many requests                    | Rate limit exceeded — check X-MBX-USED-WEIGHT-1M header   |
| 418         | -1003      | IP auto-banned                           | Too many violations. Wait for ban to lift.                 |
| 429         | -1015      | Too many new orders                      | Order rate limit. Back off.                                |

**Error Response Format:**

```json
{
    "code": -2010,
    "msg": "Account has insufficient balance for requested action."
}
```

---

## Rate Limits

| Endpoint                  | Weight | Notes                                          |
|---------------------------|--------|-------------------------------------------------|
| GET /api/v3/ping          | 1      | Connectivity test                               |
| GET /api/v3/time          | 1      | Server time                                     |
| GET /api/v3/exchangeInfo  | 20     | Cache result — rules change rarely              |
| GET /api/v3/depth         | 5-250  | Depends on limit parameter                      |
| GET /api/v3/trades        | 10     |                                                 |
| GET /api/v3/klines        | 2      |                                                 |
| GET /api/v3/ticker/24hr   | 2/80   | 2 for single symbol, 80 for all                 |
| GET /api/v3/ticker/price  | 2/4    | 2 for single, 4 for all                         |
| GET /api/v3/ticker/bookTicker | 2/4 | 2 for single, 4 for all                        |
| GET /api/v3/account       | 20     | Contains all balances                            |
| POST /api/v3/order        | 1      | Place order                                      |
| GET /api/v3/order         | 4      | Query order                                      |
| DELETE /api/v3/order      | 1      | Cancel order                                     |
| GET /api/v3/openOrders    | 6/80   | 6 for single symbol, 80 for all                 |
| GET /api/v3/myTrades      | 20     |                                                  |

**Account-level limits:**

- **1,200 request weight per minute** per API key (default)
- **10 orders per second** per account
- **200,000 orders per 24 hours** per account

**Best Practices:**

1. **Cache exchangeInfo** — refresh at most once per hour.
2. **Use `newOrderRespType=FULL`** for market orders to get fill details immediately.
3. **Monitor `X-MBX-USED-WEIGHT-1M` response header** to track rate limit consumption.
4. **Sync clocks** with `GET /api/v3/time` if you encounter -1021 errors.
5. **Use specific symbol queries** instead of fetching all symbols to minimize weight.

---

## Appendix: Response Headers

| Header                      | Description                                         |
|-----------------------------|-----------------------------------------------------|
| X-MBX-USED-WEIGHT-1M       | Weight consumed in the current 1-minute window      |
| X-MBX-ORDER-COUNT-10S      | Orders placed in the current 10-second window       |
| X-MBX-ORDER-COUNT-1D       | Orders placed in the current 24-hour window         |
| Retry-After                 | Seconds to wait (only present when rate-limited)    |
