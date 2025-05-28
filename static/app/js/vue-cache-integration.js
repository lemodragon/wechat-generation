/*!
 * Vue缓存集成脚本 v2.0
 * 无侵入式增强现有Vue应用的缓存功能，确保数据正确恢复
 * @version 2.0
 * @author Cache Manager Team
 */

(function () {
    'use strict';

    console.log('Vue缓存集成脚本开始加载...');

    // 等待Vue应用和缓存管理器加载完成
    function waitForDependencies(callback) {
        let attempts = 0;
        const maxAttempts = 100;

        function check() {
            attempts++;
            console.log(`Vue缓存集成: 检查依赖项 (尝试 ${attempts}/${maxAttempts})`);

            if (window.Vue && window.cacheManager && document.getElementById('vueApp')) {
                console.log('Vue缓存集成: 所有依赖项已加载，开始增强Vue应用');
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.warn('Vue缓存集成: 依赖项加载超时');
                console.log('依赖状态:', {
                    Vue: !!window.Vue,
                    cacheManager: !!window.cacheManager,
                    vueApp: !!document.getElementById('vueApp')
                });
            }
        }

        check();
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 增强Vue应用
    function enhanceVueApp() {
        console.log('Vue缓存集成: 开始增强Vue应用');

        // 查找Vue应用实例
        const vueElement = document.getElementById('vueApp');
        if (!vueElement) {
            console.error('Vue缓存集成: 无法找到vueApp元素');
            return;
        }

        // 等待Vue实例创建
        let vueCheckAttempts = 0;
        const maxVueAttempts = 50;

        const checkForVueInstance = () => {
            vueCheckAttempts++;
            console.log(`Vue缓存集成: 检查Vue实例 (尝试 ${vueCheckAttempts}/${maxVueAttempts})`);

            if (vueElement.__vue__) {
                console.log('Vue缓存集成: 找到Vue实例，开始增强');
                enhanceVueInstance(vueElement.__vue__);
            } else if (vueCheckAttempts < maxVueAttempts) {
                setTimeout(checkForVueInstance, 200);
            } else {
                console.warn('Vue缓存集成: 无法找到Vue实例');
            }
        };

        checkForVueInstance();
    }

    // 增强Vue实例
    function enhanceVueInstance(vueApp) {
        console.log('Vue缓存集成: 开始增强Vue实例');

        // 保存Vue应用实例到全局和缓存管理器
        window.vueApp = vueApp;
        window.cacheManager.vueApp = vueApp;

        // 创建优化的保存函数
        const deferredSave = debounce((key, data) => {
            console.log(`Vue缓存集成: 延迟保存 ${key}`, data);
            window.cacheManager.deferredSave(key, data);
        }, 1000);

        // 立即保存函数
        const immediateSave = (key, data) => {
            console.log(`Vue缓存集成: 立即保存 ${key}`, data);
            window.cacheManager.set(key, data);
        };

        // 增强Vue应用的方法
        const originalMethods = {};

        // 增强addDialog方法
        if (typeof vueApp.addDialog === 'function') {
            originalMethods.addDialog = vueApp.addDialog;
            vueApp.addDialog = function (dialog) {
                console.log('Vue缓存集成: addDialog被调用', dialog);
                const result = originalMethods.addDialog.call(this, dialog);
                // 添加对话后立即保存
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                }, 100);
                return result;
            };
        }

        // 增强deleteDialog方法
        if (typeof vueApp.deleteDialog === 'function') {
            originalMethods.deleteDialog = vueApp.deleteDialog;
            vueApp.deleteDialog = function (index) {
                console.log('Vue缓存集成: deleteDialog被调用', index);
                const result = originalMethods.deleteDialog.call(this, index);
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                }, 100);
                return result;
            };
        }

        // 增强cleanDialogs方法
        if (typeof vueApp.cleanDialogs === 'function') {
            originalMethods.cleanDialogs = vueApp.cleanDialogs;
            vueApp.cleanDialogs = function () {
                if (confirm('您确认要清空对话内容？')) {
                    console.log('Vue缓存集成: cleanDialogs被调用');
                    const result = originalMethods.cleanDialogs.call(this);
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                    window.cacheManager.updateCacheStatus('对话已清空');
                    return result;
                }
            };
        }

        // 增强addUser方法
        if (typeof vueApp.addUser === 'function') {
            originalMethods.addUser = vueApp.addUser;
            vueApp.addUser = function () {
                console.log('Vue缓存集成: addUser被调用');
                const result = originalMethods.addUser.call(this);
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.users, this.users);
                }, 100);
                return result;
            };
        }

        // 增强delUser方法
        if (typeof vueApp.delUser === 'function') {
            originalMethods.delUser = vueApp.delUser;
            vueApp.delUser = function (index) {
                console.log('Vue缓存集成: delUser被调用', index);
                const result = originalMethods.delUser.call(this, index);
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.users, this.users);
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                }, 100);
                return result;
            };
        }

        // 增强红包领取方法
        if (typeof vueApp.redpacketGet === 'function') {
            originalMethods.redpacketGet = vueApp.redpacketGet;
            vueApp.redpacketGet = function (index) {
                console.log('Vue缓存集成: redpacketGet被调用', index);
                const result = originalMethods.redpacketGet.call(this, index);
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                }, 100);
                return result;
            };
        }

        // 增强转账领取方法
        if (typeof vueApp.transferGet === 'function') {
            originalMethods.transferGet = vueApp.transferGet;
            vueApp.transferGet = function (index) {
                console.log('Vue缓存集成: transferGet被调用', index);
                const result = originalMethods.transferGet.call(this, index);
                setTimeout(() => {
                    immediateSave(window.cacheManager.keys.dialogs, this.dialogs);
                }, 100);
                return result;
            };
        }

        // 添加新的缓存相关方法
        vueApp.saveToCacheManager = function () {
            console.log('Vue缓存集成: 手动保存被调用');
            window.cacheManager.saveAll();
            window.cacheManager.updateCacheStatus('手动保存完成');
        };

        vueApp.loadFromCacheManager = function () {
            console.log('Vue缓存集成: 手动加载被调用');
            return window.cacheManager.forceRestoreToVue();
        };

        // 监听数据变化并自动保存
        if (vueApp.$watch) {
            console.log('Vue缓存集成: 设置$watch监听器');

            // 监听setting变化
            vueApp.$watch('setting', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    console.log('Vue缓存集成: setting数据变化，延迟保存');
                    deferredSave(window.cacheManager.keys.setting, newVal);
                }
            }, { deep: true });

            // 监听users变化
            vueApp.$watch('users', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    console.log('Vue缓存集成: users数据变化，延迟保存');
                    deferredSave(window.cacheManager.keys.users, newVal);
                }
            }, { deep: true });

            // 监听dialogs变化
            vueApp.$watch('dialogs', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    console.log('Vue缓存集成: dialogs数据变化，延迟保存');
                    deferredSave(window.cacheManager.keys.dialogs, newVal);
                }
            }, { deep: true });
        }

        // 启动自动保存定时器
        window.cacheManager.startAutoSave(30000); // 每30秒自动保存一次

        // 监听页面可见性变化，管理自动保存
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Vue缓存集成: 页面隐藏，停止自动保存');
                window.cacheManager.stopAutoSave();
                window.cacheManager.saveAll();
            } else {
                console.log('Vue缓存集成: 页面显示，启动自动保存');
                window.cacheManager.startAutoSave(30000);
            }
        });

        // 监听页面刷新，保存数据
        window.addEventListener('beforeunload', () => {
            console.log('Vue缓存集成: 页面即将关闭，保存数据');
            window.cacheManager.saveAll();
        });

        // 初始化完成提示
        console.log('Vue缓存集成: 初始化完成');

        // 显示集成成功提示
        setTimeout(() => {
            window.cacheManager.updateCacheStatus('缓存增强已启用');
        }, 1500);
    }

    // 等待依赖项加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Vue缓存集成: DOM加载完成，等待依赖项');
            waitForDependencies(enhanceVueApp);
        });
    } else {
        console.log('Vue缓存集成: DOM已加载，等待依赖项');
        waitForDependencies(enhanceVueApp);
    }

})(); 