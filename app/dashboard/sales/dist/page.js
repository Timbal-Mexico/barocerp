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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
var supabase_1 = require("@/lib/supabase");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
var input_1 = require("@/components/ui/input");
var create_sale_dialog_1 = require("@/components/dashboard/create-sale-dialog");
var edit_sale_dialog_1 = require("@/components/dashboard/edit-sale-dialog");
var date_fns_1 = require("date-fns");
var locale_1 = require("date-fns/locale");
function SalesPage() {
    var _a = react_1.useState([]), sales = _a[0], setSales = _a[1];
    var _b = react_1.useState([]), filteredSales = _b[0], setFilteredSales = _b[1];
    var _c = react_1.useState(true), loading = _c[0], setLoading = _c[1];
    var _d = react_1.useState(false), showCreateDialog = _d[0], setShowCreateDialog = _d[1];
    var _e = react_1.useState(''), searchTerm = _e[0], setSearchTerm = _e[1];
    var _f = react_1.useState('all'), channelFilter = _f[0], setChannelFilter = _f[1];
    var _g = react_1.useState(null), editingSale = _g[0], setEditingSale = _g[1];
    var _h = react_1.useState(false), showEditDialog = _h[0], setShowEditDialog = _h[1];
    react_1.useEffect(function () {
        loadSales();
    }, []);
    react_1.useEffect(function () {
        filterSales();
    }, [sales, searchTerm, channelFilter]);
    function loadSales() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sales')
                                .select('*, leads(name)')
                                .order('created_at', { ascending: false })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        setSales(data || []);
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _b.sent();
                        console.error('Error loading sales:', error_1);
                        return [3 /*break*/, 4];
                    case 3:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function deleteSale(id) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esto restaurará el inventario.'))
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, supabase_1.supabase.from('sales')["delete"]().eq('id', id)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        loadSales();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Error deleting sale:', error_2);
                        alert('Error al eliminar la venta');
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    }
    function filterSales() {
        var filtered = __spreadArrays(sales);
        if (searchTerm) {
            filtered = filtered.filter(function (sale) {
                var _a;
                return sale.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || ((_a = sale.leads) === null || _a === void 0 ? void 0 : _a.name.toLowerCase().includes(searchTerm.toLowerCase()));
            });
        }
        if (channelFilter !== 'all') {
            filtered = filtered.filter(function (sale) { return sale.channel === channelFilter; });
        }
        setFilteredSales(filtered);
    }
    var totalSales = filteredSales.reduce(function (sum, sale) { return sum + Number(sale.total_amount); }, 0);
    if (loading) {
        return React.createElement("div", null, "Cargando ventas...");
    }
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("div", null,
                React.createElement("h1", { className: "text-3xl font-bold tracking-tight" }, "Ventas"),
                React.createElement("p", { className: "text-slate-500 mt-1" }, "Gestiona y visualiza todas las ventas")),
            React.createElement(button_1.Button, { onClick: function () { return setShowCreateDialog(true); } },
                React.createElement(lucide_react_1.Plus, { className: "mr-2 h-4 w-4" }),
                "Nueva Venta")),
        React.createElement("div", { className: "grid gap-4 md:grid-cols-3" },
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, { className: "pb-2" },
                    React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, "Total Ventas")),
                React.createElement(card_1.CardContent, null,
                    React.createElement("div", { className: "text-2xl font-bold" }, filteredSales.length))),
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, { className: "pb-2" },
                    React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, "Ingresos Totales")),
                React.createElement(card_1.CardContent, null,
                    React.createElement("div", { className: "text-2xl font-bold" },
                        "$",
                        totalSales.toFixed(2)))),
            React.createElement(card_1.Card, null,
                React.createElement(card_1.CardHeader, { className: "pb-2" },
                    React.createElement(card_1.CardTitle, { className: "text-sm font-medium" }, "Ticket Promedio")),
                React.createElement(card_1.CardContent, null,
                    React.createElement("div", { className: "text-2xl font-bold" },
                        "$",
                        filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(2) : '0.00')))),
        React.createElement(card_1.Card, null,
            React.createElement(card_1.CardHeader, null,
                React.createElement("div", { className: "flex flex-col sm:flex-row gap-4" },
                    React.createElement("div", { className: "relative flex-1" },
                        React.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" }),
                        React.createElement(input_1.Input, { placeholder: "Buscar por n\u00FAmero de orden o lead...", value: searchTerm, onChange: function (e) { return setSearchTerm(e.target.value); }, className: "pl-9" })),
                    React.createElement("select", { value: channelFilter, onChange: function (e) { return setChannelFilter(e.target.value); }, className: "rounded-md border border-slate-300 px-3 py-2 text-sm" },
                        React.createElement("option", { value: "all" }, "Todos los canales"),
                        React.createElement("option", { value: "facebook" }, "Facebook"),
                        React.createElement("option", { value: "instagram" }, "Instagram"),
                        React.createElement("option", { value: "whatsapp" }, "WhatsApp"),
                        React.createElement("option", { value: "web" }, "Web"),
                        React.createElement("option", { value: "organico" }, "Org\u00E1nico")))),
            React.createElement(card_1.CardContent, null,
                React.createElement("div", { className: "overflow-x-auto" },
                    React.createElement("table", { className: "w-full" },
                        React.createElement("thead", null,
                            React.createElement("tr", { className: "border-b text-left text-sm font-medium text-slate-500" },
                                React.createElement("th", { className: "pb-3 pr-4" }, "N\u00FAmero de Orden"),
                                React.createElement("th", { className: "pb-3 pr-4" }, "Lead"),
                                React.createElement("th", { className: "pb-3 pr-4" }, "Canal"),
                                React.createElement("th", { className: "pb-3 pr-4 text-right" }, "Monto"),
                                React.createElement("th", { className: "pb-3 pr-4" }, "Fecha"),
                                React.createElement("th", { className: "pb-3" }, "Acciones"))),
                        React.createElement("tbody", { className: "text-sm" }, filteredSales.length === 0 ? (React.createElement("tr", null,
                            React.createElement("td", { colSpan: 5, className: "py-8 text-center text-slate-500" }, "No se encontraron ventas"))) : (filteredSales.map(function (sale) {
                            var _a;
                            return (React.createElement("tr", { key: sale.id, className: "border-b hover:bg-slate-50" },
                                React.createElement("td", { className: "py-3 pr-4 font-medium" }, sale.order_number),
                                React.createElement("td", { className: "py-3 pr-4" }, ((_a = sale.leads) === null || _a === void 0 ? void 0 : _a.name) || 'Sin lead'),
                                React.createElement("td", { className: "py-3 pr-4" },
                                    React.createElement("span", { className: "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize" }, sale.channel)),
                                React.createElement("td", { className: "py-3 pr-4 text-right font-medium" },
                                    "$",
                                    Number(sale.total_amount).toFixed(2)),
                                React.createElement("td", { className: "py-3 pr-4 text-slate-500" }, date_fns_1.format(new Date(sale.created_at), "d 'de' MMM, yyyy", {
                                    locale: locale_1.es
                                })),
                                React.createElement("td", { className: "py-3" },
                                    React.createElement("div", { className: "flex items-center gap-2" },
                                        React.createElement(button_1.Button, { variant: "ghost", size: "icon", onClick: function () {
                                                setEditingSale(sale);
                                                setShowEditDialog(true);
                                            } },
                                            React.createElement(lucide_react_1.Pencil, { className: "h-4 w-4 text-slate-500" })),
                                        React.createElement(button_1.Button, { variant: "ghost", size: "icon", onClick: function () { return deleteSale(sale.id); } },
                                            React.createElement(lucide_react_1.Trash2, { className: "h-4 w-4 text-red-500" }))))));
                        }))))))),
        React.createElement(create_sale_dialog_1.CreateSaleDialog, { open: showCreateDialog, onOpenChange: setShowCreateDialog, onSuccess: loadSales }),
        React.createElement(edit_sale_dialog_1.EditSaleDialog, { open: showEditDialog, onOpenChange: setShowEditDialog, onSuccess: loadSales, sale: editingSale })));
}
exports["default"] = SalesPage;
