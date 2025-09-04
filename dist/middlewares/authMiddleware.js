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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUser = exports.requireAdmin = exports.verifyToken = exports.JWT_SECRET = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.JWT_SECRET = process.env.JWT_SECRET || "secret";
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        if (!token) {
            res.status(401).json({
                status: false,
                message: "Unauthorized: Token not provided",
                data: {},
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        if (!(decoded === null || decoded === void 0 ? void 0 : decoded.id)) {
            res.status(401).json({
                status: false,
                message: "Unauthorized: Invalid token payload",
                data: {},
            });
            return;
        }
        const user = yield userModel_1.default.findById(decoded.id);
        if (!user) {
            res.status(401).json({
                status: false,
                message: "Unauthorized: User not found",
                data: {},
            });
            return;
        }
        // Attach the full user document
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({
            status: false,
            message: "Unauthorized: Invalid token",
            data: {},
        });
        return;
    }
});
exports.verifyToken = verifyToken;
// Admin-only access
const requireAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        res.status(403).json({ status: "failed", message: "Forbidden: Admins only" });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
//User-only access
const requireUser = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "user") {
        res.status(403).json({ status: "failed", message: "Forbidden: Users only" });
        return;
    }
    next();
};
exports.requireUser = requireUser;
