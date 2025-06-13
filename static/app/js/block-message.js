/**
 * 微信聊天拉黑功能
 */
(function () {
    console.log('拉黑功能脚本已加载');

    // 动态调整拉黑图标位置
    function adjustBlockIconPosition() {
        const blockIcons = document.querySelectorAll('.wechat-block-icon');

        if (blockIcons.length === 0) {
            return;
        }

        blockIcons.forEach((icon, index) => {
            const dialog = icon.closest('.wechat-dialog');
            const textBubble = dialog.querySelector('.wechat-dialog-text');

            if (!dialog || !textBubble) {
                return;
            }

            // 获取气泡相对于dialog的实际位置
            const textBubbleLeft = textBubble.offsetLeft;
            const textBubbleHeight = textBubble.offsetHeight;

            // 图标位置：紧贴气泡左边缘外侧（间距5px）
            const iconLeft = textBubbleLeft - 65; // 图标宽度60px + 间距5px

            // 垂直居中：气泡高度的一半 - 图标高度的一半
            const iconTop = (textBubbleHeight / 2) - 30; // 图标高度60px的一半是30px

            console.log(`拉黑图标定位 ${index}: 气泡位置=${textBubbleLeft}px, 高度=${textBubbleHeight}px, 图标left=${iconLeft}px, top=${iconTop}px`);

            // 使用绝对定位
            icon.style.position = 'absolute';
            icon.style.left = iconLeft + 'px';
            icon.style.top = iconTop + 'px';
            icon.style.transform = 'none';
            icon.style.zIndex = '10';
        });
    }

    // 暴露到全局方便调试
    window.adjustBlockIconPosition = adjustBlockIconPosition;

    // 测试函数
    window.testBlockIcon = function () {
        adjustBlockIconPosition();
    };

    // 监听图片生成事件
    document.addEventListener('click', function (e) {
        if (e.target && (e.target.textContent === '生成图片' || e.target.closest('button')?.textContent === '生成图片')) {
            console.log('检测到生成图片操作，准备重新调整图标位置...');
            // 延迟执行，确保DOM克隆完成后再调整
            setTimeout(() => {
                // 查找克隆的元素中的拉黑图标
                const clonedElements = document.querySelectorAll('.phone:not(#phone)');
                clonedElements.forEach(clonedPhone => {
                    const clonedIcons = clonedPhone.querySelectorAll('.wechat-block-icon');
                    clonedIcons.forEach((icon, index) => {
                        const dialog = icon.closest('.wechat-dialog');
                        const textBubble = dialog.querySelector('.wechat-dialog-text');

                        if (dialog && textBubble) {
                            const textBubbleLeft = textBubble.offsetLeft;
                            const textBubbleHeight = textBubble.offsetHeight;
                            const iconLeft = textBubbleLeft - 65;
                            const iconTop = (textBubbleHeight / 2) - 30;

                            icon.style.position = 'absolute';
                            icon.style.left = iconLeft + 'px';
                            icon.style.top = iconTop + 'px';
                            icon.style.transform = 'none';
                            icon.style.zIndex = '10';

                            console.log(`重新调整克隆图标 ${index}: left=${iconLeft}px, top=${iconTop}px`);
                        }
                    });
                });
            }, 100);
        }
    });

    // 页面加载完成后初始化
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(function () {
            // 检查Vue实例
            if (!window.vueApp) {
                console.log('Vue实例未找到，继续等待...');
                setTimeout(arguments.callee, 1000);
                return;
            }

            console.log('Vue实例已找到，初始化拉黑功能');

            // 添加拉黑功能到Vue实例
            window.vueApp.blockDialog = function (index) {
                // 设置消息为已拉黑状态
                this.$set(this.dialogs[index], "is_blocked", true);

                // 添加系统提示消息
                const noticeMessage = {
                    id: "dialog-" + (new Date).valueOf(),
                    type: "notice",
                    content: "消息已发出，但被对方拒绝了。",
                    is_system: 1
                };

                // 在当前消息后插入系统提示
                this.dialogs.splice(index + 1, 0, noticeMessage);

                // 保存到本地存储
                if (window.cacheManager) {
                    window.cacheManager.set('wechat_dialogs', this.dialogs);
                }

                // 延迟调整图标位置，确保DOM更新完成
                this.$nextTick(() => {
                    setTimeout(() => {
                        adjustBlockIconPosition();
                        // 滚动到底部
                        const phoneBody = document.querySelector(".phone-body");
                        if (phoneBody) {
                            phoneBody.scrollTop = phoneBody.scrollHeight;
                        }
                    }, 200);
                });
            };

            // 重写save方法，监控DOM变化并在克隆后调整图标
            const originalSave = window.vueApp.save;
            window.vueApp.save = function () {
                console.log('拦截save方法，监控DOM克隆...');

                // 监控body的DOM变化，捕获克隆操作
                const observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        mutation.addedNodes.forEach(function (node) {
                            if (node.nodeType === 1 && node.classList && node.classList.contains('iPhoneX')) {
                                console.log('检测到克隆的iPhoneX元素，立即调整图标位置...');

                                // 使用setTimeout确保DOM完全渲染
                                setTimeout(() => {
                                    // 立即调整克隆元素中的图标
                                    const clonedIcons = node.querySelectorAll('.wechat-block-icon');
                                    console.log(`找到 ${clonedIcons.length} 个克隆图标`);

                                    clonedIcons.forEach((icon, index) => {
                                        const dialog = icon.closest('.wechat-dialog');
                                        const textBubble = dialog.querySelector('.wechat-dialog-text');

                                        if (dialog && textBubble) {
                                            const textBubbleLeft = textBubble.offsetLeft;
                                            const textBubbleHeight = textBubble.offsetHeight;
                                            const iconLeft = textBubbleLeft - 65;
                                            const iconTop = (textBubbleHeight / 2) - 30;

                                            icon.style.position = 'absolute';
                                            icon.style.left = iconLeft + 'px';
                                            icon.style.top = iconTop + 'px';
                                            icon.style.transform = 'none';
                                            icon.style.zIndex = '10';

                                            console.log(`克隆图标调整 ${index}: 气泡位置=${textBubbleLeft}px, 图标left=${iconLeft}px, top=${iconTop}px`);
                                        }
                                    });
                                }, 10); // 短暂延迟确保渲染完成

                                // 停止监控
                                observer.disconnect();
                            }
                        });
                    });
                });

                // 开始监控body的子元素变化
                observer.observe(document.body, {
                    childList: true
                });

                // 3秒后自动停止监控（防止内存泄漏）
                setTimeout(() => {
                    observer.disconnect();
                }, 3000);

                // 调用原始save方法
                return originalSave.call(this);
            };

            // 监听窗口大小变化
            window.addEventListener('resize', adjustBlockIconPosition);

            // 监听内容变化
            const observer = new MutationObserver(function (mutations) {
                let shouldAdjust = false;
                mutations.forEach(function (mutation) {
                    if (mutation.type === 'childList' &&
                        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                        shouldAdjust = true;
                    }
                });
                if (shouldAdjust) {
                    setTimeout(adjustBlockIconPosition, 200);
                }
            });

            // 观察聊天内容区域
            const chatContent = document.querySelector('.wechat-content');
            if (chatContent) {
                observer.observe(chatContent, {
                    childList: true,
                    subtree: true
                });
            }

            // 初始调整
            setTimeout(adjustBlockIconPosition, 1000);

            console.log('拉黑功能已成功加载');
        }, 1000);
    });
})(); 