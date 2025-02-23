CREATE TABLE `orders`(
    `id` VARCHAR(20) NOT NULL PRIMARY KEY comment "大部分金流的API他們的ID都要求你是一個亂數的字串",
    `total` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT NOW(),
    `updated_at` DATETIME NOT NULL DEFAULT NOW(),
    `payment_provider` enum("PAYPAL","ECPAY"),
    `payment_way` enum("CVS","CC","ATM","PAYPAL"),
    `status` enum("WAITING","SUCCESS","FAILED","CANCEL"),
    `contents` JSON DEFAULT NULL comment "商品內容 [{商品ID, 商品數量, 商品價格}]"
);