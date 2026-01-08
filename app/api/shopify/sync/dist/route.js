"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.POST = void 0;
var server_1 = require("next/server");
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
function POST(request) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, options, supabase, _b, integration, intError, config, shopDomain, response, text, orders, syncedCount, _i, orders_1, order, leadId, lead, newLead, existingSale, _c, sale, saleError, _d, _e, item, product, error_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 19, , 20]);
                    authHeader = request.headers.get('Authorization');
                    options = {};
                    if (authHeader) {
                        options.global = {
                            headers: {
                                Authorization: authHeader
                            }
                        };
                    }
                    supabase = supabase_js_1.createClient(supabaseUrl, supabaseKey, options);
                    return [4 /*yield*/, supabase
                            .from('integrations')
                            .select('*')
                            .eq('provider', 'shopify')
                            .single()];
                case 1:
                    _b = _f.sent(), integration = _b.data, intError = _b.error;
                    if (intError || !integration) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Shopify integration not configured' }, { status: 400 })];
                    }
                    config = integration.config;
                    if (!config.shop_url || !config.access_token) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: 'Missing Shopify credentials' }, { status: 400 })];
                    }
                    shopDomain = config.shop_url.replace(/^https?:\/\//, '').replace(/\/$/, '');
                    if (!shopDomain.includes('.')) {
                        shopDomain += '.myshopify.com';
                    }
                    // Check if token looks like an access token
                    if (!config.access_token.startsWith('shpat_') && !config.access_token.startsWith('shpca_')) {
                        console.warn('Warning: Token does not start with shpat_ or shpca_. It might be an API Key instead of Access Token.');
                    }
                    return [4 /*yield*/, fetch("https://" + shopDomain + "/admin/api/2024-01/orders.json?status=any&limit=50", {
                            headers: {
                                'X-Shopify-Access-Token': config.access_token,
                                'Content-Type': 'application/json'
                            }
                        })];
                case 2:
                    response = _f.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    text = _f.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Shopify Error: " + text }, { status: response.status })];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    orders = (_f.sent()).orders;
                    syncedCount = 0;
                    _i = 0, orders_1 = orders;
                    _f.label = 6;
                case 6:
                    if (!(_i < orders_1.length)) return [3 /*break*/, 18];
                    order = orders_1[_i];
                    leadId = null;
                    if (!order.customer) return [3 /*break*/, 10];
                    return [4 /*yield*/, supabase
                            .from('leads')
                            .select('id')
                            .eq('email', order.customer.email)
                            .single()];
                case 7:
                    lead = (_f.sent()).data;
                    if (!lead) return [3 /*break*/, 8];
                    leadId = lead.id;
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, supabase
                        .from('leads')
                        .insert({
                        name: ((order.customer.first_name || '') + " " + (order.customer.last_name || '')).trim() || order.customer.email,
                        email: order.customer.email,
                        phone: order.customer.phone,
                        contact_channel: 'web'
                    })
                        .select()
                        .single()];
                case 9:
                    newLead = (_f.sent()).data;
                    if (newLead)
                        leadId = newLead.id;
                    _f.label = 10;
                case 10: return [4 /*yield*/, supabase
                        .from('sales')
                        .select('id')
                        .eq('external_id', String(order.id))
                        .single()];
                case 11:
                    existingSale = (_f.sent()).data;
                    if (!!existingSale) return [3 /*break*/, 17];
                    return [4 /*yield*/, supabase
                            .from('sales')
                            .insert({
                            order_number: order.name,
                            external_id: String(order.id),
                            lead_id: leadId,
                            channel: 'shopify',
                            total_amount: order.total_price,
                            created_at: order.created_at,
                            source: 'shopify',
                            delivery_city: ((_a = order.shipping_address) === null || _a === void 0 ? void 0 : _a.city) || null
                        })
                            .select()
                            .single()];
                case 12:
                    _c = _f.sent(), sale = _c.data, saleError = _c.error;
                    if (!(sale && !saleError)) return [3 /*break*/, 17];
                    syncedCount++;
                    _d = 0, _e = order.line_items;
                    _f.label = 13;
                case 13:
                    if (!(_d < _e.length)) return [3 /*break*/, 17];
                    item = _e[_d];
                    if (!item.sku) return [3 /*break*/, 16];
                    return [4 /*yield*/, supabase
                            .from('products')
                            .select('id')
                            .eq('sku', item.sku)
                            .single()];
                case 14:
                    product = (_f.sent()).data;
                    if (!product) return [3 /*break*/, 16];
                    return [4 /*yield*/, supabase.from('sale_items').insert({
                            sale_id: sale.id,
                            product_id: product.id,
                            quantity: item.quantity,
                            price: item.price
                        })];
                case 15:
                    _f.sent();
                    _f.label = 16;
                case 16:
                    _d++;
                    return [3 /*break*/, 13];
                case 17:
                    _i++;
                    return [3 /*break*/, 6];
                case 18: return [2 /*return*/, server_1.NextResponse.json({ message: "Sincronizaci\u00F3n completada. " + syncedCount + " pedidos nuevos." })];
                case 19:
                    error_1 = _f.sent();
                    console.error('Sync error:', error_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: error_1.message }, { status: 500 })];
                case 20: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
