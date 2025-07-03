import { body, validationResult } from "express-validator";

export const validateAppend = [
    body("previous_hash")
        .exists()
        .withMessage("previous_hash is required")
        .isString()
        .withMessage("previous_hash must be a string")
        .isLength({ min: 44, max: 44 })
        .withMessage("previous_hash must be 44 characters long"),
    body("scope")
        .exists()
        .withMessage("scope is required")
        .isString()
        .withMessage("scope must be a string")
        .isLength({ min: 1, max: 255 })
        .withMessage("scope must be between 1 and 255 characters long"),
    body("protocol")
        .exists()
        .withMessage("protocol is required")
        .isString()
        .withMessage("protocol must be a string")
        .isLength({ min: 1, max: 10 })
        .withMessage("protocol must be between 1 and 10 characters long"),
    body("key")
        .exists()
        .withMessage("key is required")
        .isString()
        .withMessage("key must be a string"),
    body("record_type")
        .exists()
        .withMessage("record_type is required")
        .isString()
        .withMessage("record_type must be a string")
        .isLength({ min: 1, max: 255 }),
    body("data")
        .exists()
        .withMessage("data is required")
        .isObject()
        .withMessage("data must be an object"),
    body("signature")
        .exists()
        .withMessage("signature is required")
        .isString()
        .withMessage("signature must be a string"),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
