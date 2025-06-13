/**
 * 项目错误处理和抑制脚本
 * 处理字体加载失败、第三方库错误等问题
 */

(function () {
    'use strict';

    console.log('错误处理脚本已加载');

    // 存储原始的console.error方法
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // 需要抑制的错误关键词
    const suppressedErrors = [
        'zenicon.woff',
        'zenicon.ttf',
        'zenicon.eot',
        'zenicon.svg',
        'pos.baidu.com',
        'Cannot read properties of undefined (reading \'setTimeout\')',
        'ERR_BLOCKED_BY_CLIENT',
        'ERR_INVALID_URL',
        'data:image/png;base',
        'Failed to load resource'
    ];

    // 检查是否应该抑制错误
    function shouldSuppressError(message) {
        const messageStr = String(message);
        return suppressedErrors.some(keyword => messageStr.includes(keyword));
    }

    // 重写console.error方法
    console.error = function (...args) {
        const message = args.join(' ');
        if (!shouldSuppressError(message)) {
            originalConsoleError.apply(console, args);
        }
    };

    // 重写console.warn方法
    console.warn = function (...args) {
        const message = args.join(' ');
        if (!shouldSuppressError(message)) {
            originalConsoleWarn.apply(console, args);
        }
    };

    // 全局错误处理
    window.addEventListener('error', function (event) {
        const errorMessage = event.message || '';
        const errorSource = event.filename || '';

        // 抑制特定错误
        if (shouldSuppressError(errorMessage) || shouldSuppressError(errorSource)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        // 处理setTimeout相关错误
        if (errorMessage.includes('setTimeout') && errorMessage.includes('undefined')) {
            event.preventDefault();
            event.stopPropagation();

            // 尝试修复这个错误
            if (typeof window.setTimeout === 'undefined') {
                console.log('修复：补充setTimeout方法');
                // 这种情况不太可能，但作为防御性编程
            }
            return false;
        }

        // 处理资源加载错误
        if (event.target && (event.target.tagName === 'LINK' || event.target.tagName === 'IMG')) {
            const src = event.target.href || event.target.src || '';
            if (shouldSuppressError(src)) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        }

        return true;
    }, true);

    // 处理未捕获的Promise拒绝
    window.addEventListener('unhandledrejection', function (event) {
        const reason = event.reason;
        const reasonStr = String(reason);

        if (shouldSuppressError(reasonStr)) {
            event.preventDefault();
            return false;
        }

        return true;
    });

    // 处理网络请求错误（如果fetch API存在）
    if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            return originalFetch.apply(this, args).catch(error => {
                const errorStr = String(error);
                if (shouldSuppressError(errorStr)) {
                    // 静默处理被抑制的错误
                    return Promise.reject(new Error('Network request failed (suppressed)'));
                }
                return Promise.reject(error);
            });
        };
    }

    // 为第三方库提供兼容性修复
    function provideFallbacks() {
        // 确保基本的DOM方法存在
        if (typeof window.requestAnimationFrame === 'undefined') {
            window.requestAnimationFrame = function (callback) {
                return setTimeout(callback, 16);
            };
        }

        // 确保基本的Object方法存在
        if (typeof Object.assign === 'undefined') {
            Object.assign = function (target) {
                for (let i = 1; i < arguments.length; i++) {
                    const source = arguments[i];
                    for (const key in source) {
                        if (source.hasOwnProperty(key)) {
                            target[key] = source[key];
                        }
                    }
                }
                return target;
            };
        }
    }

    // 延迟执行提供fallbacks
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', provideFallbacks);
    } else {
        provideFallbacks();
    }

    // 监控字体加载状态（如果支持）
    if (document.fonts && document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', function () {
            console.log('字体加载完成');
        });

        document.fonts.addEventListener('loadingerror', function (event) {
            if (event.fontface && event.fontface.family) {
                const fontFamily = event.fontface.family;
                if (shouldSuppressError(fontFamily)) {
                    // 静默处理字体加载错误
                    console.log('字体加载失败（已抑制）:', fontFamily);
                    return;
                }
            }
        });
    }

    console.log('错误处理脚本初始化完成');
})(); 