/*
 * @Author: wangqz
 * @Date: 2025-05-16
 * @LastEditTime: 2025-05-22
 * @Description: content
 */
/**
 * 深拷贝函数，支持处理循环引用、各种数据类型和自定义拷贝逻辑
 * @param {any} value - 需要拷贝的值
 * @param {Function} [customizer] - 自定义拷贝函数，可用于处理特殊类型
 * @returns {any} 深拷贝后的新值
 */
function deepClone(value, customizer = undefined) {
    // 处理 null 和非对象类型（原始值直接返回）
    if (value === null || typeof value !== "object") {
        return value;
    }

    // 处理 Date 对象
    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    // 处理 RegExp 对象
    if (value instanceof RegExp) {
        return new RegExp(value);
    }

    // 处理 Map 对象
    if (value instanceof Map) {
        const newMap = new Map();
        value.forEach((v, k) => {
            newMap.set(k, deepClone(v, customizer));
        });
        return newMap;
    }

    // 处理 Set 对象
    if (value instanceof Set) {
        const newSet = new Set();
        value.forEach((v) => {
            newSet.add(deepClone(v, customizer));
        });
        return newSet;
    }

    // 处理 DOM 元素（返回引用，不克隆）
    if (typeof window !== "undefined" && value instanceof window.Node) {
        return value;
    }

    // 处理自定义拷贝逻辑
    if (typeof customizer === "function") {
        const customized = customizer(value);
        if (customized !== undefined) {
            return customized;
        }
    }

    // 使用 WeakMap 存储已克隆的对象，防止循环引用
    const stack = new WeakMap();

    function cloneRecursive(obj) {
        // 只对对象类型进行循环引用检查
        if (obj === null || typeof obj !== "object") {
            return obj;
        }

        // 检查循环引用
        if (stack.has(obj)) {
            return stack.get(obj);
        }

        let clone;

        // 处理数组
        if (Array.isArray(obj)) {
            clone = [];
            stack.set(obj, clone);
            obj.forEach((item, index) => {
                clone[index] = cloneRecursive(item);
            });
            return clone;
        }

        // 处理普通对象和类实例
        clone = Object.create(Object.getPrototypeOf(obj));
        stack.set(obj, clone);

        // 获取所有属性（包括 Symbol 类型）
        const keys = [...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertySymbols(obj)];

        keys.forEach((key) => {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor && descriptor.enumerable) {
                const value = obj[key];
                // 递归克隆属性值
                descriptor.value = cloneRecursive(value);
                Object.defineProperty(clone, key, descriptor);
            }
        });

        return clone;
    }

    return cloneRecursive(value);
}

const waveSurferInit = (elementId) => {
    return WaveSurfer.create({
        container: elementId,
        waveColor: "rgb(200, 0, 200)",
        progressColor: "rgb(100, 0, 100)",
        plugins: [
            WaveSurfer.Hover.create({
                lineColor: "#ff0000",
                lineWidth: 2,
                labelBackground: "#555",
                labelColor: "#fff",
                labelSize: "11px",
            }),
        ],
    });
};
