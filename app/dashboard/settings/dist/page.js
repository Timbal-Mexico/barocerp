'use client';
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
var react_1 = require("react");
var supabase_1 = require("@/lib/supabase");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
function SettingsPage() {
    var _a = react_1.useState(false), loading = _a[0], setLoading = _a[1];
    var _b = react_1.useState(false), syncing = _b[0], setSyncing = _b[1];
    var _c = react_1.useState(''), shopUrl = _c[0], setShopUrl = _c[1];
    var _d = react_1.useState(''), accessToken = _d[0], setAccessToken = _d[1];
    var _e = react_1.useState(null), integrationId = _e[0], setIntegrationId = _e[1];
    react_1.useEffect(function () {
        loadSettings();
    }, []);
    function loadSettings() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, config, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('integrations')
                                .select('*')
                                .eq('provider', 'shopify')
                                .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error && error.code !== 'PGRST116')
                            throw error;
                        if (data) {
                            setIntegrationId(data.id);
                            config = data.config;
                            setShopUrl(config.shop_url || '');
                            setAccessToken(config.access_token || '');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _b.sent();
                        console.error('Error loading settings:', error_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    }
    function saveSettings(e) {
        return __awaiter(this, void 0, void 0, function () {
            var config, error, error, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        e.preventDefault();
                        setLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, 7, 8]);
                        config = {
                            shop_url: shopUrl,
                            access_token: accessToken
                        };
                        if (!integrationId) return [3 /*break*/, 3];
                        return [4 /*yield*/, supabase_1.supabase
                                .from('integrations')
                                .update({ config: config, updated_at: new Date().toISOString() })
                                .eq('id', integrationId)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, supabase_1.supabase
                            .from('integrations')
                            .insert({ provider: 'shopify', config: config, is_active: true })];
                    case 4:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        loadSettings();
                        _a.label = 5;
                    case 5:
                        alert('Configuración guardada correctamente');
                        return [3 /*break*/, 8];
                    case 6:
                        error_2 = _a.sent();
                        alert('Error al guardar: ' + error_2.message);
                        return [3 /*break*/, 8];
                    case 7:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }
    function handleSync() {
        return __awaiter(this, void 0, void 0, function () {
            var session, token, response, data, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        setSyncing(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 6, 7]);
                        return [4 /*yield*/, supabase_1.supabase.auth.getSession()];
                    case 2:
                        session = (_a.sent()).data.session;
                        token = session === null || session === void 0 ? void 0 : session.access_token;
                        if (!token) {
                            throw new Error('No hay sesión activa');
                        }
                        return [4 /*yield*/, fetch('/api/shopify/sync', {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer " + token
                                }
                            })];
                    case 3:
                        response = _a.sent();
                        return [4 /*yield*/, response.json()];
                    case 4:
                        data = _a.sent();
                        if (!response.ok)
                            throw new Error(data.error || 'Error en sincronización');
                        alert("Sincronizaci\u00F3n completada: " + data.message);
                        return [3 /*break*/, 7];
                    case 5:
                        error_3 = _a.sent();
                        alert('Error: ' + error_3.message);
                        return [3 /*break*/, 7];
                    case 6:
                        setSyncing(false);
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Configuraci\u00F3n"),
        React.createElement(card_1.Card, null,
            React.createElement(card_1.CardHeader, null,
                React.createElement(card_1.CardTitle, null, "Integraci\u00F3n Shopify"),
                React.createElement(card_1.CardDescription, null, "Conecta tu tienda para sincronizar pedidos y productos autom\u00E1ticamente.")),
            React.createElement(card_1.CardContent, null,
                React.createElement("form", { onSubmit: saveSettings, className: "space-y-4" },
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement(label_1.Label, { htmlFor: "shopUrl" }, "URL de la tienda (ej. mi-tienda.myshopify.com)"),
                        React.createElement(input_1.Input, { id: "shopUrl", value: shopUrl, onChange: function (e) { return setShopUrl(e.target.value); }, placeholder: "tienda.myshopify.com", required: true })),
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement(label_1.Label, { htmlFor: "token" }, "Admin API Access Token"),
                        React.createElement(input_1.Input, { id: "token", type: "password", value: accessToken, onChange: function (e) { return setAccessToken(e.target.value); }, placeholder: "shpat_...", required: true }),
                        React.createElement("p", { className: "text-xs text-slate-500" }, "Debes crear una App Personalizada en Shopify y obtener el token con permisos de lectura de Orders y Products.")),
                    React.createElement("div", { className: "flex gap-4 pt-4" },
                        React.createElement(button_1.Button, { type: "submit", disabled: loading },
                            loading ? React.createElement(lucide_react_1.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : React.createElement(lucide_react_1.Save, { className: "mr-2 h-4 w-4" }),
                            "Guardar Configuraci\u00F3n"),
                        React.createElement(button_1.Button, { type: "button", variant: "outline", onClick: handleSync, disabled: syncing || !integrationId },
                            syncing ? React.createElement(lucide_react_1.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : React.createElement(lucide_react_1.RefreshCw, { className: "mr-2 h-4 w-4" }),
                            "Sincronizar Ahora")))))));
}
exports["default"] = SettingsPage;
