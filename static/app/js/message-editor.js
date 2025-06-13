/**
 * 微信聊天生成器 - 消息编辑与排序功能
 * 提供消息编辑和拖拽排序功能
 */

// 等待文档加载完成
document.addEventListener('DOMContentLoaded', function () {
    // 等待Vue实例完全初始化
    setTimeout(initMessageEditor, 1000);
});

/**
 * 初始化消息编辑器功能
 */
function initMessageEditor() {
    if (!window.vueApp) {
        console.error('Vue实例未初始化，无法添加消息编辑功能');
        return;
    }

    // 添加编辑相关方法到Vue实例
    addEditMethods();

    // 初始化排序功能
    initSortable();

    console.log('消息编辑与排序功能初始化完成');

    // 初始化emoji功能
    initEmojiIntegration();
}

/**
 * 添加编辑相关方法到Vue实例
 */
function addEditMethods() {
    const vueApp = window.vueApp;

    // 添加编辑消息方法
    vueApp.editDialog = function (index) {
        // 进入编辑模式
        var dialog = this.dialogs[index];
        // 设置临时编辑内容
        this.$set(dialog, 'editContent', dialog.content);
        // 设置编辑状态
        this.$set(dialog, 'isEditing', true);
    };

    // 添加保存编辑消息方法
    vueApp.saveEditedDialog = function (index) {
        var dialog = this.dialogs[index];
        // 保存编辑后的内容
        this.$set(dialog, 'content', dialog.editContent);
        // 退出编辑模式
        this.$set(dialog, 'isEditing', false);

        // 保存到本地存储
        if (window.cacheManager) {
            window.cacheManager.set('wechat_dialogs', this.dialogs);
        }

        // 调整图标位置（因为消息高度可能发生变化）
        this.$nextTick(() => {
            setTimeout(() => {
                if (window.adjustAllIconPositions) {
                    window.adjustAllIconPositions();
                }
            }, 100);
        });
    };

    // 添加取消编辑方法
    vueApp.cancelEditDialog = function (index) {
        // 取消编辑，恢复原内容
        this.$set(this.dialogs[index], 'isEditing', false);

        // 调整图标位置
        this.$nextTick(() => {
            setTimeout(() => {
                if (window.adjustAllIconPositions) {
                    window.adjustAllIconPositions();
                }
            }, 100);
        });
    };

    // 添加通过base64数据直接添加图片对话的方法
    vueApp.addImageDialogFromData = function (imageData) {
        var selectedUser = this.getSelectedUser();
        if (!selectedUser) {
            alert('请先选择用户');
            return false;
        }

        // 直接使用base64数据创建图片对话
        var imageDialog = {
            id: "dialog-" + (new Date).valueOf(),
            type: "image",
            image: imageData,
            is_me: selectedUser.is_me,
            user_id: selectedUser.id
        };

        this.addDialog(imageDialog);
        console.log('已添加自定义emoji图片消息');
    };

    // 添加emoji内容转换方法
    vueApp.convertEmojiContent = function (content) {
        if (!content) return '';

        // 先进行HTML转义处理，防止XSS攻击
        const escapeHtml = function (unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const escapedContent = escapeHtml(content);

        // 然后转换emoji标记
        if (window.EmojiSelector && window.EmojiSelector.convertToImages) {
            return window.EmojiSelector.convertToImages(escapedContent);
        }

        return escapedContent;
    };
}

/**
 * 初始化Sortable.js排序功能
 */
function initSortable() {
    const sortableList = document.getElementById('sortableList');
    if (!sortableList) {
        console.error('无法找到可排序容器，排序功能初始化失败');
        return;
    }

    // 添加事件监听器，防止拖拽过程中的文本选择
    sortableList.addEventListener('mousedown', function (e) {
        // 阻止文本选择
        e.target.ondragstart = function () { return false; };
    });

    // 添加全局事件监听器，在拖拽过程中阻止文本选择
    document.addEventListener('selectstart', function (e) {
        // 如果正在拖拽（可以通过检查是否存在拖拽元素来判断），则阻止文本选择
        if (document.querySelector('.sortable-fallback-custom')) {
            e.preventDefault();
            return false;
        }
    });

    // 创建Sortable实例
    new Sortable(sortableList, {
        animation: 150,
        handle: '.wechat-dialog',
        ghostClass: 'sortable-ghost-custom',
        dragClass: 'sortable-drag-custom',
        chosenClass: 'sortable-chosen',
        forceFallback: true,
        fallbackClass: 'sortable-fallback-custom',
        fallbackOnBody: true,
        fallbackTolerance: 2, // 进一步降低容差值，提高拖动精确度
        scrollSensitivity: 50, // 保持滚动敏感度
        scrollSpeed: 15, // 保持滚动速度
        delay: 100,
        delayOnTouchOnly: true,
        preventOnFilter: true,
        touchStartThreshold: 3,
        // 优化拖放位置的关键配置
        swapThreshold: 0.5, // 调整交换阈值为0.5，让交换更加自然
        direction: 'vertical', // 强制垂直方向拖拽
        invertSwap: true, // 保持反转交换区域
        invertedSwapThreshold: 0.5, // 调整反转交换阈值
        multiDrag: false, // 确保禁用多选拖拽，防止干扰

        // 添加拖动过程回调函数
        onStart: function (evt) {
            console.log('开始拖拽消息');

            // 获取被拖拽元素
            const draggedItem = evt.item;
            // 标记是否为右侧消息（自己发送的）
            const isRightSide = draggedItem.classList.contains('wechat-dialog-right');
            // 为拖拽元素添加是否右侧消息的标记，便于后续处理
            draggedItem.setAttribute('data-side', isRightSide ? 'right' : 'left');

            // 清除可能的文本选择
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            } else if (document.selection) {
                document.selection.empty();
            }
        },
        onMove: function (evt, originalEvent) {
            // 获取相关元素
            const draggedItem = evt.dragged;
            const relatedItem = evt.related;

            if (!draggedItem || !relatedItem) return true;

            // 获取拖拽元素和目标元素的位置信息
            const draggedRect = draggedItem.getBoundingClientRect();
            const relatedRect = relatedItem.getBoundingClientRect();

            // 检查是否为相同布局类型的消息（同为左侧或同为右侧）
            const draggedIsRight = draggedItem.classList.contains('wechat-dialog-right');
            const relatedIsRight = relatedItem.classList.contains('wechat-dialog-right');
            const isSameLayout = (draggedIsRight === relatedIsRight);

            // 鼠标位置与目标元素中心点的垂直距离
            const mouseY = originalEvent.clientY;
            const relatedCenterY = relatedRect.top + relatedRect.height / 2;

            // 计算距离因子，用于调整布局不同时的判断逻辑
            const distanceFactor = Math.abs(mouseY - relatedCenterY) / relatedRect.height;

            // 如果是不同布局类型的消息，调整判断阈值
            if (!isSameLayout) {
                // 不同布局类型时，需要更接近中心点才允许交换
                if (distanceFactor > 0.3) { // 距离超过30%中心点，不进行交换
                    return false;
                }
            }

            // 允许默认的交换判断
            return true;
        },
        onEnd: function (evt) {
            // 获取Vue实例
            const vueApp = window.vueApp;
            if (!vueApp) return;

            // 获取原始位置和新位置
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            // 如果位置没有变化，直接返回
            if (oldIndex === newIndex) return;

            // 更新数组顺序
            const dialogItem = vueApp.dialogs.splice(oldIndex, 1)[0];
            vueApp.dialogs.splice(newIndex, 0, dialogItem);

            // 保存到本地存储
            if (window.cacheManager) {
                window.cacheManager.set('wechat_dialogs', vueApp.dialogs);
            }

            console.log(`消息从位置 ${oldIndex} 移动到位置 ${newIndex}`);

            // 确保拖拽结束后的短暂延迟内不触发文本选择
            setTimeout(function () {
                console.log('拖拽结束，恢复正常文本选择功能');
            }, 100);
        }
    });

    console.log('排序功能初始化完成');
}

/**
 * 初始化emoji集成功能
 */
function initEmojiIntegration() {
    console.log('开始初始化emoji集成功能');

    // 等待emoji选择器模块加载完成
    const waitForEmojiSelector = setInterval(() => {
        if (window.EmojiSelector) {
            clearInterval(waitForEmojiSelector);
            setupEmojiButtons();
        }
    }, 200);
}

/**
 * 设置emoji按钮事件
 */
function setupEmojiButtons() {
    // 主输入框emoji按钮
    const mainEmojiBtn = document.querySelector('.main-emoji-btn');
    const mainTextarea = document.getElementById('main-dialog-textarea');

    if (mainEmojiBtn && mainTextarea) {
        mainEmojiBtn.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            window.EmojiSelector.show(this, mainTextarea);
        });
        console.log('主输入框emoji按钮已绑定');
    }

    // 为编辑模式的emoji按钮设置委托事件
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('edit-emoji-btn')) {
            event.preventDefault();
            event.stopPropagation();

            const index = event.target.getAttribute('data-index');
            const editTextarea = document.getElementById('edit-textarea-' + index);

            if (editTextarea) {
                window.EmojiSelector.show(event.target, editTextarea);
                console.log('编辑模式emoji按钮被点击，索引:', index);
            }
        }
    });

    console.log('Emoji按钮事件绑定完成');
}

/**
 * 调整编辑图标位置，与拉黑图标垂直对齐但不重叠
 */
function adjustEditIconPosition() {
    const editIcons = document.querySelectorAll('.a-wechat-dialog-edit');

    editIcons.forEach((editIcon) => {
        const dialog = editIcon.closest('.wechat-dialog');
        if (!dialog) return;

        const textBubble = dialog.querySelector('.wechat-dialog-text');
        const blockIcon = dialog.querySelector('.wechat-block-icon');

        if (!textBubble) return;

        const textBubbleHeight = textBubble.offsetHeight;
        const isLongText = textBubbleHeight > 150; // 判断是否为长文本

        if (blockIcon) {
            // 如果有拉黑图标，编辑图标在拉黑图标左边
            const blockIconLeft = parseInt(blockIcon.style.left) || 0;
            const blockIconTop = parseInt(blockIcon.style.top) || 0;

            // 编辑图标在拉黑图标左边70px（图标宽度60px + 间距10px）
            const editIconLeft = blockIconLeft - 70;

            // 切换到left定位，确保位置准确
            editIcon.style.position = 'absolute';
            editIcon.style.left = editIconLeft + 'px';
            editIcon.style.right = 'auto'; // 清除right定位
            editIcon.style.top = blockIconTop + 'px'; // 与拉黑图标同一水平线

            console.log(`编辑图标在拉黑图标左边，left=${editIconLeft}px, top=${blockIconTop}px`);
        } else {
            // 无拉黑图标时恢复默认的right定位
            editIcon.style.position = 'absolute';
            editIcon.style.left = 'auto'; // 清除left定位
            editIcon.style.right = '90px'; // 恢复默认right位置

            if (isLongText) {
                // 长文本：移到气泡顶部
                editIcon.style.top = '10px';
                console.log('长文本消息，编辑图标移到顶部');
            } else {
                // 短文本：恢复默认位置
                editIcon.style.top = '30px';
                console.log('恢复编辑图标默认位置');
            }
        }
    });
}

// 暴露函数到全局，方便其他脚本调用
window.adjustEditIconPosition = adjustEditIconPosition; 