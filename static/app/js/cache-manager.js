/*!
 * 微信对话生成器 - 增强缓存管理器
 * 提供完整的浏览器缓存功能，重点确保数据恢复正常工作
 * @version 2.0
 * @author Cache Manager Team
 */

class CacheManager {
    constructor() {
        this.keys = {
            setting: 'wechat_setting',
            users: 'wechat_users',
            dialogs: 'wechat_dialogs',
            meta: 'wechat_cache_meta',
            backup: 'wechat_backup_'
        };
        this.autoSaveInterval = null;
        this.saveTimeout = null;
        this.isPageUnloading = false;
        this.vueApp = null;
        this.isInitialized = false;

        // 状态管理属性 - 防止状态跳动
        this.currentStatus = '初始化中...';
        this.statusTimer = null;
        this.lastStatusTime = 0;

        // 通知管理属性 - 防止通知叠加
        this.notificationContainer = null;
        this.notificationQueue = [];
        this.notificationIdCounter = 0;

        // 恢复状态管理属性 - 防止重复恢复
        this.recoveryState = {
            isRecovering: false,
            hasRecovered: false,
            recoveryAttempts: 0,
            maxAttempts: 3,
            lastRecoveryTime: 0
        };

        // 初始化
        this.init();
    }

    /**
     * 初始化缓存管理器
     */
    init() {
        console.log('缓存管理器开始初始化...');

        // 检查是否有异常退出的数据需要恢复
        this.checkForRecovery();

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveAll();
                this.updateCacheStatus('页面切换保存');
            }
        });

        // 监听页面卸载
        window.addEventListener('beforeunload', (e) => {
            this.isPageUnloading = true;
            this.saveAll();
            this.setNormalExit(false);
        });

        // 页面加载完成后标记正常状态
        window.addEventListener('load', () => {
            this.setNormalExit(true);
        });

        this.isInitialized = true;
        console.log('缓存管理器初始化完成');
    }

    /**
     * 设置数据并立即保存
     */
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.updateCacheStatus('已保存');
            this.updateMeta();
            console.log(`缓存管理器: 数据已保存到 ${key}`);
            return true;
        } catch (error) {
            console.error('缓存管理器: 保存失败', error);
            this.showNotification('保存失败：存储空间不足', 'error');
            return false;
        }
    }

    /**
     * 获取数据
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            const result = data ? JSON.parse(data) : null;
            console.log(`缓存管理器: 从 ${key} 读取数据`, result);
            return result;
        } catch (error) {
            console.error('缓存管理器: 读取失败', error);
            return null;
        }
    }

    /**
     * 延迟保存机制（防抖）
     */
    deferredSave(key, data) {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.updateCacheStatus('保存中...');

        this.saveTimeout = setTimeout(() => {
            this.set(key, data);
        }, 2000); // 2秒延迟保存
    }

    /**
     * 立即保存所有数据
     */
    saveAll() {
        try {
            // 多种方式尝试获取Vue应用实例
            let app = this.getVueApp();

            if (app && app.$data) {
                console.log('缓存管理器: 找到Vue应用，开始保存数据');
                const saved = {
                    setting: this.set(this.keys.setting, app.setting || app.$data.setting),
                    users: this.set(this.keys.users, app.users || app.$data.users),
                    dialogs: this.set(this.keys.dialogs, app.dialogs || app.$data.dialogs)
                };

                if (saved.setting && saved.users && saved.dialogs) {
                    this.updateCacheStatus('全部保存完成');
                    return true;
                }
            } else {
                console.warn('缓存管理器: 无法找到Vue应用实例');
                return false;
            }
        } catch (error) {
            console.error('缓存管理器: 保存数据时出错', error);
            this.showNotification('保存失败：' + error.message, 'error');
            return false;
        }
    }

    /**
     * 获取Vue应用实例 - 增强版，多路径检测
     */
    getVueApp() {
        // 方法1：使用缓存的Vue应用实例
        if (this.vueApp && this.vueApp.$data) {
            return this.vueApp;
        }

        // 方法2：使用全局window.vueApp
        if (window.vueApp && window.vueApp.$data) {
            this.vueApp = window.vueApp;
            return this.vueApp;
        }

        // 方法3：从DOM元素获取Vue实例
        const vueElement = document.getElementById('vueApp');
        if (vueElement && vueElement.__vue__) {
            this.vueApp = vueElement.__vue__;
            window.vueApp = this.vueApp;
            console.log('缓存管理器: 从DOM获取到Vue实例');
            return this.vueApp;
        }

        // 方法4：尝试从Vue构造函数获取活跃实例
        if (window.Vue && window.Vue.prototype) {
            // 查找所有Vue实例
            const allElements = document.querySelectorAll('[id^="vue"], [class*="vue"]');
            for (let element of allElements) {
                if (element.__vue__ && element.__vue__.$data) {
                    this.vueApp = element.__vue__;
                    window.vueApp = this.vueApp;
                    console.log('缓存管理器: 从元素查找获取到Vue实例');
                    return this.vueApp;
                }
            }
        }

        // 方法5：尝试通过Vue根组件获取
        if (window.Vue && window.Vue.prototype && document.querySelector('[data-server-rendered="true"]')) {
            const ssrElement = document.querySelector('[data-server-rendered="true"]');
            if (ssrElement && ssrElement.__vue__) {
                this.vueApp = ssrElement.__vue__;
                window.vueApp = this.vueApp;
                console.log('缓存管理器: 从SSR元素获取到Vue实例');
                return this.vueApp;
            }
        }

        // 方法6：尝试从body的子元素中查找Vue实例
        const bodyChildren = document.body.children;
        for (let child of bodyChildren) {
            if (child.__vue__ && child.__vue__.$data) {
                this.vueApp = child.__vue__;
                window.vueApp = this.vueApp;
                console.log('缓存管理器: 从body子元素获取到Vue实例');
                return this.vueApp;
            }
        }

        console.warn('缓存管理器: 无法找到Vue应用实例');
        return null;
    }

    /**
     * 统一恢复入口 - 防止重复恢复操作
     */
    performRecovery(source = 'unknown', forceRecover = false) {
        const now = Date.now();

        // 检查是否正在恢复中
        if (this.recoveryState.isRecovering && !forceRecover) {
            console.log(`缓存管理器: 恢复正在进行中，忽略来自 ${source} 的恢复请求`);
            return false;
        }

        // 检查是否已经恢复过
        if (this.recoveryState.hasRecovered && !forceRecover) {
            console.log(`缓存管理器: 数据已恢复过，忽略来自 ${source} 的恢复请求`);
            return false;
        }

        // 检查恢复频率限制（5秒内最多恢复一次）
        if (now - this.recoveryState.lastRecoveryTime < 5000 && !forceRecover) {
            console.log(`缓存管理器: 恢复操作过于频繁，忽略来自 ${source} 的恢复请求`);
            return false;
        }

        // 检查恢复次数限制
        if (this.recoveryState.recoveryAttempts >= this.recoveryState.maxAttempts && !forceRecover) {
            console.log(`缓存管理器: 恢复尝试次数已达上限，忽略来自 ${source} 的恢复请求`);
            return false;
        }

        // 检查是否有有效缓存数据
        if (!this.hasValidCacheData()) {
            console.log(`缓存管理器: 没有有效的缓存数据，来自 ${source} 的恢复请求取消`);
            return false;
        }

        console.log(`缓存管理器: 开始执行来自 ${source} 的数据恢复`);

        // 设置恢复状态
        this.recoveryState.isRecovering = true;
        this.recoveryState.recoveryAttempts++;
        this.recoveryState.lastRecoveryTime = now;

        try {
            const success = this.forceRestoreToVue(true);

            if (success) {
                this.recoveryState.hasRecovered = true;
                console.log(`缓存管理器: 来自 ${source} 的数据恢复成功`);

                // 只在特定来源时显示用户提示
                if (source === 'crash-recovery') {
                    this.updateCacheStatus('已恢复上次会话');
                } else if (source === 'auto-restore') {
                    this.updateCacheStatus('数据已恢复');
                    this.showNotification('缓存数据已自动恢复！', 'success');
                } else if (source === 'import-recovery') {
                    this.updateCacheStatus('导入数据已恢复');
                    this.showNotification('导入的数据已成功恢复到界面！', 'success');
                }

                return true;
            } else {
                console.log(`缓存管理器: 来自 ${source} 的数据恢复失败`);
                return false;
            }
        } catch (error) {
            console.error(`缓存管理器: 来自 ${source} 的数据恢复异常`, error);
            return false;
        } finally {
            // 延迟重置恢复状态，防止短时间内重复触发
            setTimeout(() => {
                this.recoveryState.isRecovering = false;
            }, 1000);
        }
    }

    /**
     * 强制恢复数据到Vue应用
     */
    forceRestoreToVue(silent = false) {
        const app = this.getVueApp();
        if (!app) {
            console.warn('缓存管理器: 无法找到Vue应用实例进行数据恢复');
            return false;
        }

        try {
            const setting = this.get(this.keys.setting);
            const users = this.get(this.keys.users);
            const dialogs = this.get(this.keys.dialogs);

            console.log('缓存管理器: 开始恢复数据到Vue应用');
            console.log('设置数据:', setting);
            console.log('用户数据:', users);
            console.log('对话数据:', dialogs);

            let restored = false;

            if (setting) {
                if (app.$data && app.$data.setting) {
                    Object.assign(app.$data.setting, setting);
                } else if (app.setting) {
                    Object.assign(app.setting, setting);
                }
                console.log('设置数据已恢复');
                restored = true;
            }

            if (users && Array.isArray(users) && users.length > 0) {
                if (app.$data && app.$data.users) {
                    app.$data.users = users;
                } else if (app.users) {
                    app.users = users;
                }
                console.log('用户数据已恢复');
                restored = true;
            }

            if (dialogs && Array.isArray(dialogs) && dialogs.length > 0) {
                if (app.$data && app.$data.dialogs) {
                    app.$data.dialogs = dialogs;
                } else if (app.dialogs) {
                    app.dialogs = dialogs;
                }
                console.log('对话数据已恢复');
                restored = true;
            }

            if (restored) {
                if (!silent) {
                    this.updateCacheStatus('数据已恢复');
                    this.showNotification('缓存数据已恢复到应用！', 'success');
                }

                // 强制Vue重新渲染
                if (app.$forceUpdate) {
                    app.$forceUpdate();
                }

                return true;
            } else {
                console.log('缓存管理器: 没有有效的缓存数据需要恢复');
                return false;
            }
        } catch (error) {
            console.error('缓存管理器: 数据恢复失败', error);
            if (!silent) {
                this.showNotification('数据恢复失败：' + error.message, 'error');
            }
            return false;
        }
    }

    /**
     * 即时恢复数据 - 专门用于导入后的即时恢复，绕过所有限制
     */
    immediateRestore() {
        console.log('缓存管理器: 开始即时恢复导入的数据');

        // 多种方式尝试获取Vue应用实例
        let app = this.getVueApp();
        let attempts = 0;
        const maxAttempts = 10;

        // 如果第一次没找到，再尝试几次
        while (!app && attempts < maxAttempts) {
            attempts++;
            console.log(`缓存管理器: 第${attempts}次尝试获取Vue应用实例`);

            // 尝试从多个位置获取Vue实例
            if (window.vueApp && window.vueApp.$data) {
                app = window.vueApp;
                this.vueApp = app;
            } else {
                const vueElement = document.getElementById('vueApp');
                if (vueElement && vueElement.__vue__) {
                    app = vueElement.__vue__;
                    window.vueApp = app;
                    this.vueApp = app;
                }
            }

            if (!app) {
                // 短暂等待再尝试
                const start = Date.now();
                while (Date.now() - start < 100) {
                    // 同步等待100ms
                }
            }
        }

        if (!app || !app.$data) {
            console.error('缓存管理器: 即时恢复失败，无法找到Vue应用实例');
            return false;
        }

        try {
            const setting = this.get(this.keys.setting);
            const users = this.get(this.keys.users);
            const dialogs = this.get(this.keys.dialogs);

            console.log('缓存管理器: 即时恢复数据详情', { setting, users, dialogs });

            let restored = false;

            // 恢复设置数据
            if (setting && typeof setting === 'object') {
                if (app.$data && app.$data.setting) {
                    // 完全替换而不是合并，确保导入的数据完整恢复
                    app.$data.setting = { ...app.$data.setting, ...setting };
                } else if (app.setting) {
                    app.setting = { ...app.setting, ...setting };
                }
                console.log('缓存管理器: 设置数据即时恢复成功');
                restored = true;
            }

            // 恢复用户数据
            if (users && Array.isArray(users) && users.length > 0) {
                if (app.$data && app.$data.hasOwnProperty('users')) {
                    app.$data.users = [...users];
                } else if (app.hasOwnProperty('users')) {
                    app.users = [...users];
                }
                console.log('缓存管理器: 用户数据即时恢复成功');
                restored = true;
            }

            // 恢复对话数据
            if (dialogs && Array.isArray(dialogs) && dialogs.length > 0) {
                if (app.$data && app.$data.hasOwnProperty('dialogs')) {
                    app.$data.dialogs = [...dialogs];
                } else if (app.hasOwnProperty('dialogs')) {
                    app.dialogs = [...dialogs];
                }
                console.log('缓存管理器: 对话数据即时恢复成功');
                restored = true;
            }

            if (restored) {
                // 强制Vue重新渲染
                if (app.$forceUpdate) {
                    app.$forceUpdate();
                }

                // 触发Vue的响应式更新
                if (app.$nextTick) {
                    app.$nextTick(() => {
                        console.log('缓存管理器: Vue响应式更新完成');
                    });
                }

                console.log('缓存管理器: 即时恢复成功');
                return true;
            } else {
                console.log('缓存管理器: 没有有效数据需要即时恢复');
                return false;
            }
        } catch (error) {
            console.error('缓存管理器: 即时恢复过程中发生错误', error);
            return false;
        }
    }

    /**
     * 创建备份
     */
    createBackup() {
        try {
            const timestamp = new Date().getTime();
            const backupKey = this.keys.backup + timestamp;
            const backupData = {
                setting: this.get(this.keys.setting),
                users: this.get(this.keys.users),
                dialogs: this.get(this.keys.dialogs),
                timestamp: timestamp,
                version: '2.0',
                createdAt: new Date().toISOString()
            };

            localStorage.setItem(backupKey, JSON.stringify(backupData));
            this.updateCacheStatus('备份已创建');
            this.showNotification('备份创建成功', 'success');

            // 清理旧备份（只保留最近5个）
            this.cleanOldBackups();

            return backupKey;
        } catch (error) {
            console.error('缓存管理器: 创建备份失败', error);
            this.showNotification('备份创建失败：' + error.message, 'error');
            return null;
        }
    }

    /**
     * 恢复备份
     */
    restoreBackup(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                this.showNotification('备份文件不存在', 'error');
                return false;
            }

            const data = JSON.parse(backupData);
            let restored = true;

            if (data.setting) restored &= this.set(this.keys.setting, data.setting);
            if (data.users) restored &= this.set(this.keys.users, data.users);
            if (data.dialogs) restored &= this.set(this.keys.dialogs, data.dialogs);

            if (restored) {
                this.updateCacheStatus('数据已恢复');
                this.showNotification('备份恢复成功！页面将在2秒后自动刷新。', 'success');

                // 自动刷新页面，无需用户确认
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

                return true;
            } else {
                this.showNotification('数据恢复部分失败', 'error');
                return false;
            }
        } catch (error) {
            console.error('缓存管理器: 恢复备份失败', error);
            this.showNotification('数据恢复失败：' + error.message, 'error');
            return false;
        }
    }

    /**
     * 检查是否需要数据恢复
     */
    checkForRecovery() {
        const meta = this.getMeta();
        const hasData = this.hasValidCacheData();

        console.log('缓存管理器: 检查恢复状态', { meta, hasData });

        if (hasData) {
            // 检查是否是导入数据后的恢复需求
            if (meta && meta.needsImportRecovery) {
                console.log('缓存管理器: 检测到导入数据后的恢复需求，开始强制恢复');

                // 清除导入恢复标记
                meta.needsImportRecovery = false;
                localStorage.setItem(this.keys.meta, JSON.stringify(meta));

                // 强制恢复导入的数据
                this.waitForVueAndForceRestore();
                return;
            }

            // 有数据，等待Vue应用加载完成后恢复
            this.waitForVueAndRestore();
        }

        // 异常退出的情况单独处理，只显示提示不直接恢复
        if (meta && !meta.normalExit && hasData) {
            setTimeout(() => {
                this.showRecoveryDialog();
            }, 2000);
        }
    }

    /**
     * 等待Vue应用加载并恢复数据
     */
    waitForVueAndRestore() {
        let attempts = 0;
        const maxAttempts = 100; // 10秒最大等待时间

        const checkAndRestore = () => {
            attempts++;
            const app = this.getVueApp();

            if (app && app.$data) {
                console.log('缓存管理器: Vue应用已加载，尝试自动恢复数据');
                this.performRecovery('auto-restore');
            } else if (attempts < maxAttempts) {
                setTimeout(checkAndRestore, 100);
            } else {
                console.warn('缓存管理器: 等待Vue应用超时，无法自动恢复数据');
            }
        };

        // 延迟开始检查，确保页面已加载
        setTimeout(checkAndRestore, 500);
    }

    /**
     * 等待Vue应用加载并强制恢复导入的数据
     */
    waitForVueAndForceRestore() {
        let attempts = 0;
        const maxAttempts = 100; // 10秒最大等待时间

        const checkAndForceRestore = () => {
            attempts++;
            const app = this.getVueApp();

            if (app && app.$data) {
                console.log('缓存管理器: Vue应用已加载，开始强制恢复导入的数据');
                // 使用forceRecover=true参数绕过所有限制条件
                this.performRecovery('import-recovery', true);
            } else if (attempts < maxAttempts) {
                setTimeout(checkAndForceRestore, 100);
            } else {
                console.warn('缓存管理器: 等待Vue应用超时，无法强制恢复导入的数据');
            }
        };

        // 延迟开始检查，确保页面已加载
        setTimeout(checkAndForceRestore, 500);
    }

    /**
     * 检查是否有有效的缓存数据
     */
    hasValidCacheData() {
        const dialogs = this.get(this.keys.dialogs);
        const users = this.get(this.keys.users);
        const setting = this.get(this.keys.setting);

        return (dialogs && dialogs.length > 0) ||
            (users && users.length > 0) ||
            (setting && Object.keys(setting).length > 0);
    }

    /**
     * 显示数据恢复对话框 - 优化版，减少提示干扰
     */
    showRecoveryDialog() {
        const hasData = this.hasValidCacheData();

        if (hasData && !this.recoveryState.hasRecovered) {
            // 静默恢复数据，不显示浏览器确认对话框
            console.log('缓存管理器: 检测到异常退出，开始静默恢复数据');
            const success = this.performRecovery('crash-recovery');

            if (success) {
                // 只显示异常退出恢复的提示
                this.showNotification('检测到异常退出，已自动恢复您的聊天记录！', 'success');
            }
        }
    }

    /**
     * 显示通知 - 增强版，支持队列管理和动画效果
     */
    showNotification(message, type = 'info') {
        console.log(`缓存管理器通知 [${type}]: ${message}`);

        // 创建通知容器（如果不存在）
        if (!this.notificationContainer) {
            this.notificationContainer = document.createElement('div');
            this.notificationContainer.id = 'cache-notification-container';
            this.notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 350px;
                pointer-events: none;
            `;
            document.body.appendChild(this.notificationContainer);
        }

        // 创建通知元素
        const notificationId = ++this.notificationIdCounter;
        const notification = document.createElement('div');
        notification.id = `notification-${notificationId}`;
        notification.className = `cache-notification cache-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            padding: 16px 20px;
            margin-bottom: 10px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            word-wrap: break-word;
            pointer-events: auto;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            border-left: 4px solid ${type === 'success' ? '#388E3C' : type === 'error' ? '#C62828' : '#1976D2'};
        `;

        // 添加关闭按钮
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 12px;
            font-size: 18px;
            font-weight: bold;
            opacity: 0.7;
            cursor: pointer;
            transition: opacity 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.removeNotification(notificationId);
        };
        notification.appendChild(closeBtn);

        // 添加点击关闭功能
        notification.onclick = () => {
            this.removeNotification(notificationId);
        };

        // 添加到容器和队列
        this.notificationContainer.appendChild(notification);
        this.notificationQueue.push({
            id: notificationId,
            element: notification,
            timestamp: Date.now()
        });

        // 触发进入动画
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        // 设置自动移除定时器
        setTimeout(() => {
            this.removeNotification(notificationId);
        }, 4500);

        // 清理旧通知（保持最多5个）
        this.cleanOldNotifications();
    }

    /**
     * 移除指定通知
     */
    removeNotification(notificationId) {
        const notificationData = this.notificationQueue.find(item => item.id === notificationId);
        if (!notificationData) return;

        const notification = notificationData.element;

        // 退出动画
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        notification.style.marginBottom = '0';
        notification.style.padding = '0 20px';
        notification.style.height = '0';

        // 动画完成后移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            // 从队列中移除
            this.notificationQueue = this.notificationQueue.filter(item => item.id !== notificationId);

            // 如果没有通知了，移除容器
            if (this.notificationQueue.length === 0 && this.notificationContainer) {
                document.body.removeChild(this.notificationContainer);
                this.notificationContainer = null;
            }
        }, 300);
    }

    /**
     * 清理旧通知
     */
    cleanOldNotifications() {
        if (this.notificationQueue.length > 5) {
            const oldestNotification = this.notificationQueue[0];
            this.removeNotification(oldestNotification.id);
        }
    }

    /**
     * 更新缓存状态显示 - 增强版，防止状态跳动
     */
    updateCacheStatus(status) {
        const statusElement = document.getElementById('cache-status');
        if (!statusElement) return;

        // 防止重复设置相同状态
        if (this.currentStatus === status) {
            console.log(`缓存状态重复，已忽略: ${status}`);
            return;
        }

        // 防止过于频繁的状态更新（限制在1秒内最多更新一次）
        const now = Date.now();
        if (now - this.lastStatusTime < 1000 && status === '缓存正常') {
            console.log(`缓存状态更新过于频繁，已忽略: ${status}`);
            return;
        }

        // 清除之前的状态恢复定时器
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }

        // 更新状态显示
        this.currentStatus = status;
        this.lastStatusTime = now;
        statusElement.textContent = status;
        statusElement.className = 'cache-status-indicator';
        console.log(`缓存状态更新: ${status}`);

        // 根据状态类型设置不同的恢复时间
        let resetDelay = 3000; // 默认3秒

        // 重要状态显示更长时间
        if (status.includes('完成') || status.includes('成功') || status.includes('失败') || status.includes('错误')) {
            resetDelay = 5000; // 5秒
        }

        // 普通状态较短时间
        if (status.includes('正常') || status.includes('中...')) {
            resetDelay = 2000; // 2秒
        }

        // 设置状态恢复定时器，但只有在状态未再次变化时才恢复
        this.statusTimer = setTimeout(() => {
            // 确保这是最后设置的定时器且状态未发生变化
            if (statusElement.textContent === status && this.currentStatus === status) {
                this.currentStatus = '缓存正常';
                statusElement.textContent = '缓存正常';
                console.log('缓存状态已恢复为: 缓存正常');
            }
            this.statusTimer = null;
        }, resetDelay);
    }

    /**
     * 设置正常退出标记
     */
    setNormalExit(isNormal) {
        try {
            const meta = this.getMeta() || {};
            meta.normalExit = isNormal;
            meta.lastUpdate = new Date().getTime();
            localStorage.setItem(this.keys.meta, JSON.stringify(meta));
        } catch (error) {
            console.error('缓存管理器: 设置退出标记失败', error);
        }
    }

    /**
     * 更新缓存元数据
     */
    updateMeta() {
        try {
            const meta = this.getMeta() || {};
            meta.lastSave = new Date().getTime();
            meta.version = '2.0';
            localStorage.setItem(this.keys.meta, JSON.stringify(meta));
        } catch (error) {
            console.error('缓存管理器: 更新元数据失败', error);
        }
    }

    /**
     * 获取缓存元数据
     */
    getMeta() {
        try {
            const meta = localStorage.getItem(this.keys.meta);
            return meta ? JSON.parse(meta) : null;
        } catch (error) {
            console.error('缓存管理器: 获取元数据失败', error);
            return null;
        }
    }

    /**
     * 清理旧备份
     */
    cleanOldBackups() {
        try {
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keys.backup)) {
                    backupKeys.push(key);
                }
            }

            // 按时间戳排序，删除旧的备份
            backupKeys.sort().reverse();
            while (backupKeys.length > 5) {
                const oldKey = backupKeys.pop();
                localStorage.removeItem(oldKey);
            }
        } catch (error) {
            console.error('缓存管理器: 清理备份失败', error);
        }
    }

    /**
     * 导出数据
     */
    exportData() {
        try {
            const data = {
                setting: this.get(this.keys.setting),
                users: this.get(this.keys.users),
                dialogs: this.get(this.keys.dialogs),
                exportTime: new Date().toISOString(),
                version: '2.0'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `微信对话生成器_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.updateCacheStatus('数据已导出');
            this.showNotification('数据导出成功', 'success');
        } catch (error) {
            console.error('缓存管理器: 导出数据失败', error);
            this.showNotification('数据导出失败：' + error.message, 'error');
        }
    }

    /**
     * 导入数据
     */
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    let imported = true;
                    if (data.setting) imported &= this.set(this.keys.setting, data.setting);
                    if (data.users) imported &= this.set(this.keys.users, data.users);
                    if (data.dialogs) imported &= this.set(this.keys.dialogs, data.dialogs);

                    if (imported) {
                        this.updateCacheStatus('数据导入中...');
                        console.log('缓存管理器: 数据导入到localStorage成功，开始即时恢复');

                        // 立即恢复数据到Vue应用，无需刷新页面
                        setTimeout(() => {
                            const restoreSuccess = this.immediateRestore();
                            if (restoreSuccess) {
                                this.updateCacheStatus('导入完成');
                                this.showNotification('数据导入成功！已立即应用到界面。', 'success');
                                resolve(true);
                            } else {
                                // 如果即时恢复失败，提供刷新选项
                                this.updateCacheStatus('导入成功，需要刷新');
                                this.showNotification('数据导入成功！需要刷新页面查看效果。', 'info');
                                setTimeout(() => {
                                    if (confirm('数据已导入成功！是否刷新页面以确保完全生效？')) {
                                        window.location.reload();
                                    }
                                }, 1000);
                                resolve(true);
                            }
                        }, 500);
                    } else {
                        this.showNotification('数据导入失败：存储错误', 'error');
                        reject(new Error('存储错误'));
                    }
                } catch (error) {
                    this.showNotification('数据导入失败：文件格式错误', 'error');
                    reject(error);
                }
            };
            reader.onerror = () => {
                this.showNotification('数据导入失败：文件读取错误', 'error');
                reject(new Error('文件读取错误'));
            };
            reader.readAsText(file);
        });
    }

    /**
     * 清空所有缓存
     */
    clearAll() {
        if (confirm('确定要清空所有缓存数据吗？此操作不可恢复！')) {
            try {
                localStorage.removeItem(this.keys.setting);
                localStorage.removeItem(this.keys.users);
                localStorage.removeItem(this.keys.dialogs);
                localStorage.removeItem(this.keys.meta);

                // 清理所有备份
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(this.keys.backup)) {
                        localStorage.removeItem(key);
                    }
                }

                this.updateCacheStatus('缓存已清空');
                this.showNotification('所有缓存数据已清空', 'success');

                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                console.error('缓存管理器: 清空缓存失败', error);
                this.showNotification('清空缓存失败：' + error.message, 'error');
            }
        }
    }

    /**
     * 获取缓存统计信息
     */
    getCacheStats() {
        try {
            const stats = {
                setting: !!this.get(this.keys.setting),
                users: this.get(this.keys.users)?.length || 0,
                dialogs: this.get(this.keys.dialogs)?.length || 0,
                lastSave: null,
                backupCount: 0
            };

            const meta = this.getMeta();
            if (meta && meta.lastSave) {
                stats.lastSave = new Date(meta.lastSave).toLocaleString();
            }

            // 统计备份数量
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keys.backup)) {
                    stats.backupCount++;
                }
            }

            return stats;
        } catch (error) {
            console.error('缓存管理器: 获取统计失败', error);
            return {
                setting: false,
                users: 0,
                dialogs: 0,
                lastSave: null,
                backupCount: 0
            };
        }
    }

    /**
     * 启动自动保存定时器
     */
    startAutoSave(interval = 30000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (!document.hidden) {
                const app = this.getVueApp();
                if (app && app.dialogs && app.dialogs.length > 0) {
                    this.saveAll();
                    this.updateCacheStatus('自动保存完成');
                }
            }
        }, interval);
    }

    /**
     * 停止自动保存定时器
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}

// 全局缓存管理器实例
window.cacheManager = new CacheManager(); 