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
exports.deleteDailyMessage = exports.updateDailyMessage = exports.getDailyMessageById = exports.getAllDailyMessages = exports.createDailyMessage = void 0;
const dailyMessageModel_1 = __importDefault(require("../models/dailyMessageModel"));
const dayjs_1 = __importDefault(require("dayjs"));
const relativeTime_1 = __importDefault(require("dayjs/plugin/relativeTime"));
const userModel_1 = __importDefault(require("../models/userModel"));
dayjs_1.default.extend(relativeTime_1.default);
// Create
const createDailyMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const adminId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { content } = req.body;
    try {
        const newMessage = yield dailyMessageModel_1.default.create({ adminId, content });
        const admin = yield userModel_1.default.findById(adminId).select("name photoURL");
        res.status(201).json({
            message: "Daily message created",
            status: true,
            data: {
                _id: newMessage._id,
                content: newMessage.content,
                postedBy: admin,
                date: (0, dayjs_1.default)(newMessage.createdAt).format("MMMM D, YYYY"),
                timeAgo: (0, dayjs_1.default)(newMessage.createdAt).fromNow(),
            },
        });
    }
    catch (err) {
        res.status(500).json({ status: false, message: "Failed to create daily message", data: { error: err } });
    }
});
exports.createDailyMessage = createDailyMessage;
// Get All
const getAllDailyMessages = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = yield dailyMessageModel_1.default.find()
            .sort({ createdAt: -1 })
            .populate("adminId", "name photoURL");
        if (!messages || messages.length === 0) {
            res.status(404).json({ status: false, message: "No daily messages found" });
            return;
        }
        res.status(200).json({
            message: "Daily messages fetched",
            status: true,
            data: {
                messages: messages.map(msg => ({
                    _id: msg._id,
                    content: msg.content,
                    postedBy: msg.adminId,
                    date: (0, dayjs_1.default)(msg.createdAt).format("MMMM D, YYYY"),
                    timeAgo: (0, dayjs_1.default)(msg.createdAt).fromNow(),
                }))
            }
        });
    }
    catch (err) {
        res.status(500).json({ status: false, message: "Failed to fetch daily messages", data: { error: err } });
    }
});
exports.getAllDailyMessages = getAllDailyMessages;
//  Get by ID
const getDailyMessageById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const message = yield dailyMessageModel_1.default.findById(id).populate("adminId", "name photoURL");
        if (!message) {
            res.status(404).json({ status: false, message: "Daily message not found" });
            return;
        }
        res.status(200).json({
            status: true,
            message: "Daily message fetched",
            data: {
                _id: message._id,
                content: message.content,
                postedBy: message.adminId,
                date: (0, dayjs_1.default)(message.createdAt).format("MMMM D, YYYY"),
                timeAgo: (0, dayjs_1.default)(message.createdAt).fromNow(),
            }
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Failed to fetch daily message by ID", data: { error: error } });
    }
});
exports.getDailyMessageById = getDailyMessageById;
//  Update
const updateDailyMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { content } = req.body;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        res.status(403).json({ status: false, message: "Only admin can update daily messages" });
        return;
    }
    try {
        const message = yield dailyMessageModel_1.default.findByIdAndUpdate(id, { content }, { new: true }).populate("adminId", "name photoURL");
        if (!message) {
            res.status(404).json({ status: false, message: "Daily message not found" });
            return;
        }
        res.status(200).json({
            message: "Message updated",
            status: true,
            data: {
                _id: message._id,
                content: message.content,
                postedBy: message.adminId,
                date: (0, dayjs_1.default)(message.createdAt).format("MMMM D, YYYY"),
                timeAgo: (0, dayjs_1.default)(message.createdAt).fromNow(),
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Update failed", data: { error: error } });
    }
});
exports.updateDailyMessage = updateDailyMessage;
//  Delete
const deleteDailyMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        res.status(403).json({ status: false, message: "Only admin can delete daily messages" });
        return;
    }
    try {
        const message = yield dailyMessageModel_1.default.findByIdAndDelete(id);
        if (!message) {
            res.status(404).json({ status: false, message: "Message not found" });
            return;
        }
        res.status(200).json({ status: true, message: "Message deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ status: false, message: "Delete failed", data: { error: error } });
    }
});
exports.deleteDailyMessage = deleteDailyMessage;
