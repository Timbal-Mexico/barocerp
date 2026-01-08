'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.EditLeadDialog = void 0;
var react_1 = require("react");
var supabase_1 = require("@/lib/supabase");
var dialog_1 = require("@/components/ui/dialog");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
function EditLeadDialog(_a) {
    var open = _a.open, onOpenChange = _a.onOpenChange, onSuccess = _a.onSuccess, lead = _a.lead;
    var _b = react_1.useState([]), products = _b[0], setProducts = _b[1];
    var _c = react_1.useState({
        name: '',
        email: '',
        phone: '',
        interest_product_id: '',
        contact_channel: 'facebook'
    }), formData = _c[0], setFormData = _c[1];
    var _d = react_1.useState(false), loading = _d[0], setLoading = _d[1];
    react_1.useEffect(function () {
        if (open) {
            loadProducts();
        }
    }, [open]);
    react_1.useEffect(function () {
        if (lead) {
            setFormData({
                name: lead.name || '',
                email: lead.email || '',
                phone: lead.phone || '',
                interest_product_id: lead.interest_product_id || '',
                contact_channel: lead.contact_channel || 'facebook'
            });
        }
    }, [lead]);
    function loadProducts() {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, supabase_1.supabase
                            .from('products')
                            .select('id, name')
                            .eq('active', true)
                            .order('name')];
                    case 1:
                        data = (_a.sent()).data;
                        if (data)
                            setProducts(data);
                        return [2 /*return*/];
                }
            });
        });
    }
    function handleSubmit(e) {
        return __awaiter(this, void 0, void 0, function () {
            var error, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        e.preventDefault();
                        if (!lead)
                            return [2 /*return*/];
                        setLoading(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, supabase_1.supabase
                                .from('leads')
                                .update({
                                name: formData.name,
                                email: formData.email || null,
                                phone: formData.phone || null,
                                interest_product_id: formData.interest_product_id || null,
                                contact_channel: formData.contact_channel
                            })
                                .eq('id', lead.id)];
                    case 2:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        onSuccess();
                        onOpenChange(false);
                        return [3 /*break*/, 5];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Error updating lead:', error_1);
                        alert('Error al actualizar el lead: ' + error_1.message);
                        return [3 /*break*/, 5];
                    case 4:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
    return (React.createElement(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange },
        React.createElement(dialog_1.DialogContent, { className: "max-w-md" },
            React.createElement(dialog_1.DialogHeader, null,
                React.createElement(dialog_1.DialogTitle, null, "Editar Lead"),
                React.createElement(dialog_1.DialogDescription, null, "Modifica la informaci\u00F3n del contacto")),
            React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
                React.createElement("div", { className: "space-y-2" },
                    React.createElement(label_1.Label, { htmlFor: "edit-name" }, "Nombre *"),
                    React.createElement(input_1.Input, { id: "edit-name", value: formData.name, onChange: function (e) {
                            return setFormData(__assign(__assign({}, formData), { name: e.target.value }));
                        }, required: true })),
                React.createElement("div", { className: "space-y-2" },
                    React.createElement(label_1.Label, { htmlFor: "edit-email" }, "Correo electr\u00F3nico"),
                    React.createElement(input_1.Input, { id: "edit-email", type: "email", value: formData.email, onChange: function (e) {
                            return setFormData(__assign(__assign({}, formData), { email: e.target.value }));
                        } })),
                React.createElement("div", { className: "space-y-2" },
                    React.createElement(label_1.Label, { htmlFor: "edit-phone" }, "Tel\u00E9fono"),
                    React.createElement(input_1.Input, { id: "edit-phone", type: "tel", value: formData.phone, onChange: function (e) {
                            return setFormData(__assign(__assign({}, formData), { phone: e.target.value }));
                        } })),
                React.createElement("div", { className: "space-y-2" },
                    React.createElement(label_1.Label, { htmlFor: "edit-interest_product" }, "Producto de inter\u00E9s"),
                    React.createElement("select", { id: "edit-interest_product", value: formData.interest_product_id, onChange: function (e) {
                            return setFormData(__assign(__assign({}, formData), { interest_product_id: e.target.value }));
                        }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm" },
                        React.createElement("option", { value: "" }, "No especificado"),
                        products.map(function (product) { return (React.createElement("option", { key: product.id, value: product.id }, product.name)); }))),
                React.createElement("div", { className: "space-y-2" },
                    React.createElement(label_1.Label, { htmlFor: "edit-contact_channel" }, "Canal de contacto *"),
                    React.createElement("select", { id: "edit-contact_channel", value: formData.contact_channel, onChange: function (e) {
                            return setFormData(__assign(__assign({}, formData), { contact_channel: e.target.value }));
                        }, className: "w-full rounded-md border border-slate-300 px-3 py-2 text-sm", required: true },
                        React.createElement("option", { value: "facebook" }, "Facebook"),
                        React.createElement("option", { value: "instagram" }, "Instagram"),
                        React.createElement("option", { value: "whatsapp" }, "WhatsApp"),
                        React.createElement("option", { value: "web" }, "Web"),
                        React.createElement("option", { value: "otro" }, "Otro"))),
                React.createElement("div", { className: "flex gap-3" },
                    React.createElement(button_1.Button, { type: "button", variant: "outline", onClick: function () { return onOpenChange(false); }, className: "flex-1" }, "Cancelar"),
                    React.createElement(button_1.Button, { type: "submit", disabled: loading, className: "flex-1" }, loading ? 'Guardando...' : 'Guardar Cambios'))))));
}
exports.EditLeadDialog = EditLeadDialog;
