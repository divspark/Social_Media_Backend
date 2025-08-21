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
exports.checkFeatureAccess = void 0;
const userModel_1 = __importDefault(require("../models/userModel"));
const checkFeatureAccess = (feature) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const user = yield userModel_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const isRestricted = (_c = (_b = user.restrictions) === null || _b === void 0 ? void 0 : _b.get(feature)) !== null && _c !== void 0 ? _c : false;
        if (isRestricted) {
            res.status(403).json({
                message: `You are restricted from using the '${feature}' feature.`,
            });
            return;
        }
        next();
    }
    catch (err) {
        res.status(500).json({ message: "Feature access check failed", error: err });
    }
});
exports.checkFeatureAccess = checkFeatureAccess;
