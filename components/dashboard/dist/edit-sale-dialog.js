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
exports.EditSaleDialog = void 0;
var react_1 = require("react");
var supabase_1 = require("@/lib/supabase");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var lucide_react_1 = require("lucide-react");
function EditSaleDialog(_a) {
    var open = _a.open, onOpenChange = _a.onOpenChange, onSuccess = _a.onSuccess, sale = _a.sale;
    var _b = react_1.useState([]), leads = _b[0], setLeads = _b[1];
    var _c = react_1.useState([]), products = _c[0], setProducts = _c[1];
    var _d = react_1.useState(''), selectedLead = _d[0], setSelectedLead = _d[1];
    var _e = react_1.useState('facebook'), channel = _e[0], setChannel = _e[1];
    var _f = react_1.useState([]), items = _f[0], setItems = _f[1];
    var _g = react_1.useState(false), loading = _g[0], setLoading = _g[1];
    var _h = react_1.useState('none'), promotionType = _h[0], setPromotionType = _h[1];
    var _j = react_1.useState(0), discountValue = _j[0], setDiscountValue = _j[1];
    react_1.useEffect(function () {
        if (open) {
            loadData();
        }
    }, [open]);
    react_1.useEffect(function () {
        if (sale && open) {
            setSelectedLead(sale.lead_id || '');
            setChannel(sale.channel || 'facebook');
            setPromotionType(sale.promotion_type || 'none');
            setDiscountValue(sale.discount_value || 0);
            loadSaleItems(sale.id);
        }
    }, [sale, open]);
    function loadData() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, leadsResult, productsResult;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            supabase_1.supabase.from('leads').select('id, name, email').order('name'),
                            supabase_1.supabase.from('products').select('*').eq('active', true).order('name'),
                        ])];
                    case 1:
                        _a = _b.sent(), leadsResult = _a[0], productsResult = _a[1];
                        if (leadsResult.data)
                            setLeads(leadsResult.data);
                        if (productsResult.data)
                            setProducts(productsResult.data);
                        return [2 /*return*/];
                }
            });
        });
    }
    function loadSaleItems(saleId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, supabase_1.supabase
                            .from('sale_items')
                            .select('*')
                            .eq('sale_id', saleId)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (data) {
                            setItems(data.map(function (item) { return ({
                                id: item.id,
                                product_id: item.product_id,
                                quantity: item.quantity,
                                price: item.price
                            }); }));
                        }
                        return [2 /*return*/];
                }
            });
        });
    }
    function addItem() {
        setItems(__spreadArrays(items, [{ product_id: '', quantity: 1, price: 0 }]));
    }
    function removeItem(index) {
        setItems(items.filter(function (_, i) { return i !== index; }));
    }
    function updateItem(index, field, value) {
        var newItems = __spreadArrays(items);
        if (field === 'product_id') {
            newItems[index].product_id = value;
            var product = products.find(function (p) { return p.id === value; });
            if (product) {
                newItems[index].price = product.price;
            }
        }
        else if (field === 'quantity') {
            newItems[index].quantity = value;
        }
        else if (field === 'price') {
            newItems[index].price = value;
        }
        setItems(newItems);
    }
    function calculateTotal() {
        var total = items.reduce(function (sum, item) { return sum + Number(item.price) * item.quantity; }, 0);
        if (promotionType === 'percentage') {
            total = total * (1 - discountValue / 100);
        }
        else if (promotionType === '2x1') {
            total = items.reduce(function (sum, item) {
                var payQuantity = Math.ceil(item.quantity / 2);
                return sum + Number(item.price) * payQuantity;
            }, 0);
        }
        else if (promotionType === '3x1') {
            total = items.reduce(function (sum, item) {
                var payQuantity = Math.ceil(item.quantity / 3);
                return sum + Number(item.price) * payQuantity;
            }, 0);
        }
        return total;
    }
    function handleSubmit(e) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _i, items_1, item, totalAmount_1, saleUpdateData, saleError, deleteError, saleItems, itemsError, error_1, totalAmount_2, retryError, deleteError, saleItems, itemsError, retryErr_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        e.preventDefault();
                        if (!sale)
                            return [2 /*return*/];
                        setLoading(true);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 5, 14, 15]);
                        if (items.length === 0) {
                            alert('Agrega al menos un producto');
                            return [2 /*return*/];
                        }
                        for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                            item = items_1[_i];
                            if (!item.product_id) {
                                alert('Selecciona un producto para todos los items');
                                return [2 /*return*/];
                            }
                            if (item.quantity <= 0) {
                                alert('La cantidad debe ser mayor a 0');
                                return [2 /*return*/];
                            }
                        }
                        totalAmount_1 = calculateTotal();
                        saleUpdateData = {
                            lead_id: selectedLead || null,
                            channel: channel,
                            total_amount: totalAmount_1,
                            promotion_type: promotionType,
                            discount_value: promotionType === 'percentage' ? discountValue : 0
                        };
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sales')
                                .update(saleUpdateData)
                                .eq('id', sale.id)];
                    case 2:
                        saleError = (_b.sent()).error;
                        if (saleError)
                            throw saleError;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sale_items')["delete"]()
                                .eq('sale_id', sale.id)];
                    case 3:
                        deleteError = (_b.sent()).error;
                        if (deleteError)
                            throw deleteError;
                        saleItems = items.map(function (item) { return ({
                            sale_id: sale.id,
                            product_id: item.product_id,
                            quantity: item.quantity,
                            price: item.price
                        }); });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sale_items')
                                .insert(saleItems)];
                    case 4:
                        itemsError = (_b.sent()).error;
                        if (itemsError)
                            throw itemsError;
                        onSuccess();
                        onOpenChange(false);
                        return [3 /*break*/, 15];
                    case 5:
                        error_1 = _b.sent();
                        console.error('Error updating sale:', error_1);
                        if (!(((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('column')) || error_1.code === '42703')) return [3 /*break*/, 12];
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 10, , 11]);
                        totalAmount_2 = calculateTotal();
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sales')
                                .update({
                                lead_id: selectedLead || null,
                                channel: channel,
                                total_amount: totalAmount_2
                            })
                                .eq('id', sale.id)];
                    case 7:
                        retryError = (_b.sent()).error;
                        if (retryError)
                            throw retryError;
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sale_items')["delete"]()
                                .eq('sale_id', sale.id)];
                    case 8:
                        deleteError = (_b.sent()).error;
                        if (deleteError)
                            throw deleteError;
                        saleItems = items.map(function (item) { return ({
                            sale_id: sale.id,
                            product_id: item.product_id,
                            quantity: item.quantity,
                            price: item.price
                        }); });
                        return [4 /*yield*/, supabase_1.supabase
                                .from('sale_items')
                                .insert(saleItems)];
                    case 9:
                        itemsError = (_b.sent()).error;
                        if (itemsError)
                            throw itemsError;
                        onSuccess();
                        onOpenChange(false);
                        return [2 /*return*/];
                    case 10:
                        retryErr_1 = _b.sent();
                        alert('Error al actualizar la venta (reintento): ' + retryErr_1.message);
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        alert('Error al actualizar la venta: ' + error_1.message);
                        _b.label = 13;
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 15: return [2 /*return*/];
                }
            });
        });
    }
    var totalAmount = calculateTotal();
    return (React.createElement(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange },
        React.createElement(dialog_1.DialogContent, { className: "max-w-3xl max-h-[90vh] overflow-y-auto" },
            React.createElement(dialog_1.DialogHeader, null,
                React.createElement(dialog_1.DialogTitle, null, "Editar Venta"),
                React.createElement(dialog_1.DialogDescription, null,
                    "Modifica los detalles de la venta ", sale === null || sale === void 0 ? void 0 :
                    sale.order_number)),
            React.createElement("form", { onSubmit: handleSubmit, className: "space-y-6" },
                React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" },
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement(label_1.Label, { htmlFor: "edit-lead" }, "Lead (opcional)"),
                        React.createElement("select", { id: "edit-lead", value: selectedLead, onChange: function (e) { return setSelectedLead(e.target.value); }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm" },
                            React.createElement("option", { value: "" }, "Sin lead"),
                            leads.map(function (lead) { return (React.createElement("option", { key: lead.id, value: lead.id },
                                lead.name,
                                " ",
                                lead.email ? "(" + lead.email + ")" : '')); }))),
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement(label_1.Label, { htmlFor: "edit-channel" }, "Canal de venta"),
                        React.createElement("select", { id: "edit-channel", value: channel, onChange: function (e) { return setChannel(e.target.value); }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm", required: true },
                            React.createElement("option", { value: "facebook" }, "Facebook"),
                            React.createElement("option", { value: "instagram" }, "Instagram"),
                            React.createElement("option", { value: "whatsapp" }, "WhatsApp"),
                            React.createElement("option", { value: "web" }, "Web"),
                            React.createElement("option", { value: "organico" }, "Org\u00E1nico")))),
                React.createElement("div", { className: "space-y-4" },
                    React.createElement(label_1.Label, null, "Promociones y Descuentos"),
                    React.createElement("div", { className: "grid gap-4 sm:grid-cols-2" },
                        React.createElement("div", null,
                            React.createElement("select", { value: promotionType, onChange: function (e) { return setPromotionType(e.target.value); }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm" },
                                React.createElement("option", { value: "none" }, "Ninguna"),
                                React.createElement("option", { value: "2x1" }, "2x1 (Lleva 2, paga 1)"),
                                React.createElement("option", { value: "3x1" }, "3x1 (Lleva 3, paga 1)"),
                                React.createElement("option", { value: "percentage" }, "Porcentaje de descuento"))),
                        promotionType === 'percentage' && (React.createElement("div", null,
                            React.createElement("div", { className: "relative" },
                                React.createElement(input_1.Input, { type: "number", min: "0", max: "100", value: discountValue, onChange: function (e) { return setDiscountValue(Number(e.target.value)); }, placeholder: "%", className: "pr-8" }),
                                React.createElement("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" }, "%")))))),
                React.createElement("div", { className: "space-y-4" },
                    React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement(label_1.Label, null, "Productos"),
                        React.createElement(button_1.Button, { type: "button", size: "sm", onClick: addItem, variant: "outline" },
                            React.createElement(lucide_react_1.Plus, { className: "mr-2 h-4 w-4" }),
                            "Agregar producto")),
                    items.map(function (item, index) {
                        var product = products.find(function (p) { return p.id === item.product_id; });
                        return (React.createElement("div", { key: index, className: "grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr,100px,100px,auto]" },
                            React.createElement("div", { className: "space-y-2" },
                                React.createElement(label_1.Label, null, "Producto"),
                                React.createElement("select", { value: item.product_id, onChange: function (e) {
                                        return updateItem(index, 'product_id', e.target.value);
                                    }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm", required: true },
                                    React.createElement("option", { value: "" }, "Seleccionar"),
                                    products.map(function (product) { return (React.createElement("option", { key: product.id, value: product.id },
                                        product.name,
                                        " - $",
                                        product.price,
                                        " (Stock: ",
                                        product.stock,
                                        ")")); }))),
                            React.createElement("div", { className: "space-y-2" },
                                React.createElement(label_1.Label, null, "Cantidad"),
                                React.createElement(input_1.Input, { type: "number", min: "1", 
                                    // Note: validation against stock is tricky during edit because 
                                    // current quantity is already consumed. 
                                    // Simple approach: don't limit by stock in UI strictly for now or use (stock + initial_quantity)
                                    value: item.quantity, onChange: function (e) {
                                        return updateItem(index, 'quantity', parseInt(e.target.value) || 1);
                                    }, required: true })),
                            React.createElement("div", { className: "space-y-2" },
                                React.createElement(label_1.Label, null, "Precio"),
                                React.createElement(input_1.Input, { type: "number", step: "0.01", min: "0", value: item.price, onChange: function (e) {
                                        return updateItem(index, 'price', parseFloat(e.target.value) || 0);
                                    }, required: true })),
                            React.createElement("div", { className: "flex items-end" },
                                React.createElement(button_1.Button, { type: "button", size: "icon", variant: "ghost", onClick: function () { return removeItem(index); } },
                                    React.createElement(lucide_react_1.X, { className: "h-4 w-4" })))));
                    }),
                    items.length === 0 && (React.createElement("div", { className: "rounded-lg border border-dashed p-8 text-center text-sm text-slate-500" }, "No hay productos agregados."))),
                React.createElement("div", { className: "flex items-center justify-between rounded-lg bg-slate-50 p-4" },
                    React.createElement("span", { className: "text-lg font-semibold" }, "Total:"),
                    React.createElement("span", { className: "text-2xl font-bold" },
                        "$",
                        totalAmount.toFixed(2))),
                React.createElement("div", { className: "flex gap-3" },
                    React.createElement(button_1.Button, { type: "button", variant: "outline", onClick: function () { return onOpenChange(false); }, className: "flex-1" }, "Cancelar"),
                    React.createElement(button_1.Button, { type: "submit", disabled: loading, className: "flex-1" }, loading ? 'Guardando...' : 'Guardar Cambios'))))));
}
exports.EditSaleDialog = EditSaleDialog;
