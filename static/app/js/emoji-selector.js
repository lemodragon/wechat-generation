/**
 * Emoji选择器模块
 * 支持主输入框和编辑模式的emoji插入功能
 */
(function () {
    console.log('Emoji选择器模块已加载');

    // Emoji配置
    const EMOJI_CONFIG = {
        basePath: './static/app/emoji/',
        totalCount: 108,
        filePattern: '1 ({index}).gif',
        panelId: 'emoji-selector-panel',
        activeButtonClass: 'emoji-btn-active'
    };

    let currentActiveButton = null;
    let currentTargetTextarea = null;
    let emojiPanel = null;

    /**
     * 初始化emoji选择器
     */
    function initEmojiSelector() {
        createEmojiPanel();
        bindGlobalEvents();
        console.log('Emoji选择器初始化完成');
    }

    /**
     * 创建emoji选择面板
     */
    function createEmojiPanel() {
        // 创建面板容器
        emojiPanel = document.createElement('div');
        emojiPanel.id = EMOJI_CONFIG.panelId;
        emojiPanel.className = 'emoji-selector-panel';
        emojiPanel.style.display = 'none';

        // 创建标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'emoji-panel-title';
        titleBar.innerHTML = `
            <span>选择表情</span>
            <button class="emoji-panel-close" onclick="window.EmojiSelector.hide()">×</button>
        `;

        // 创建emoji网格容器
        const emojiGrid = document.createElement('div');
        emojiGrid.className = 'emoji-grid';

        // 加载所有emoji
        for (let i = 1; i <= EMOJI_CONFIG.totalCount; i++) {
            const emojiItem = document.createElement('div');
            emojiItem.className = 'emoji-item';

            const emojiImg = document.createElement('img');
            emojiImg.src = EMOJI_CONFIG.basePath + EMOJI_CONFIG.filePattern.replace('{index}', i);
            emojiImg.alt = `表情${i}`;
            emojiImg.title = `表情${i}`;
            emojiImg.onerror = function () {
                console.warn(`表情图片加载失败: ${this.src}`);
                this.style.display = 'none';
            };

            emojiItem.appendChild(emojiImg);
            emojiItem.addEventListener('click', () => selectEmoji(emojiImg.src, i));
            emojiGrid.appendChild(emojiItem);
        }

        // 创建用户自定义emoji区域
        const customSection = document.createElement('div');
        customSection.className = 'emoji-custom-section';
        customSection.innerHTML = `
            <div class="emoji-section-title">自定义表情</div>
            <div class="emoji-upload-area">
                <input type="file" id="custom-emoji-input" accept="image/*" style="display: none;">
                <button class="emoji-upload-btn" onclick="document.getElementById('custom-emoji-input').click()">
                    <span>+</span>
                    <div>上传图片</div>
                </button>
            </div>
        `;

        // 组装面板
        emojiPanel.appendChild(titleBar);
        emojiPanel.appendChild(emojiGrid);
        emojiPanel.appendChild(customSection);

        document.body.appendChild(emojiPanel);

        // 绑定自定义emoji上传事件
        document.getElementById('custom-emoji-input').addEventListener('change', handleCustomEmojiUpload);
    }

    /**
     * 处理自定义emoji上传
     */
    function handleCustomEmojiUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        // 检查文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片文件过大，请选择小于5MB的图片');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            // 作为图片消息添加
            if (window.vueApp && typeof window.vueApp.addImageDialogFromData === 'function') {
                window.vueApp.addImageDialogFromData(reader.result);
                hide(); // 隐藏emoji面板
            } else {
                console.error('Vue实例或addImageDialogFromData方法不存在');
            }
        };
        reader.readAsDataURL(file);

        // 清空input
        event.target.value = '';
    }

    /**
 * 选择emoji
 */
    function selectEmoji(imageSrc, index) {
        if (!currentTargetTextarea) {
            console.warn('没有目标文本框');
            return;
        }

        // 创建emoji标记用于插入（特殊格式便于后续转换）
        const emojiMarker = `[:emoji:${index}:]`;

        // 插入到目标文本框
        insertEmojiToTextarea(currentTargetTextarea, emojiMarker);

        // 隐藏面板
        hide();

        console.log(`已选择表情${index}`);
    }

    /**
 * 插入emoji到文本框
 */
    function insertEmojiToTextarea(textarea, emojiMarker) {
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(cursorPos);

        // 插入emoji标记
        textarea.value = textBefore + emojiMarker + textAfter;

        // 触发Vue的数据更新
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);

        // 设置光标位置
        const newPos = cursorPos + emojiMarker.length;
        setTimeout(() => {
            textarea.setSelectionRange(newPos, newPos);
            textarea.focus();
        }, 10);
    }

    /**
     * 显示emoji面板
     */
    function show(buttonElement, targetTextarea) {
        if (!emojiPanel) {
            console.error('Emoji面板未初始化');
            return;
        }

        // 记录当前状态
        currentActiveButton = buttonElement;
        currentTargetTextarea = targetTextarea;

        // 更新按钮状态
        document.querySelectorAll('.emoji-trigger-btn').forEach(btn => {
            btn.classList.remove(EMOJI_CONFIG.activeButtonClass);
        });
        buttonElement.classList.add(EMOJI_CONFIG.activeButtonClass);

        // 计算面板位置
        positionPanel(buttonElement);

        // 显示面板
        emojiPanel.style.display = 'block';

        // 添加动画效果
        setTimeout(() => {
            emojiPanel.classList.add('emoji-panel-visible');
        }, 10);

        console.log('Emoji面板已显示');
    }

    /**
     * 隐藏emoji面板
     */
    function hide() {
        if (!emojiPanel) return;

        emojiPanel.classList.remove('emoji-panel-visible');

        setTimeout(() => {
            emojiPanel.style.display = 'none';
        }, 300);

        // 清除按钮激活状态
        if (currentActiveButton) {
            currentActiveButton.classList.remove(EMOJI_CONFIG.activeButtonClass);
        }

        // 重置状态
        currentActiveButton = null;
        currentTargetTextarea = null;

        console.log('Emoji面板已隐藏');
    }

    /**
     * 计算并设置面板位置
     */
    function positionPanel(buttonElement) {
        const buttonRect = buttonElement.getBoundingClientRect();
        const panelWidth = 400;
        const panelHeight = 350;
        const margin = 10;

        let left = buttonRect.left;
        let top = buttonRect.bottom + margin;

        // 检查右侧边界
        if (left + panelWidth > window.innerWidth) {
            left = window.innerWidth - panelWidth - margin;
        }

        // 检查左侧边界
        if (left < margin) {
            left = margin;
        }

        // 检查底部边界
        if (top + panelHeight > window.innerHeight) {
            top = buttonRect.top - panelHeight - margin;
        }

        // 检查顶部边界
        if (top < margin) {
            top = margin;
        }

        emojiPanel.style.left = left + 'px';
        emojiPanel.style.top = top + 'px';
    }

    /**
     * 绑定全局事件
     */
    function bindGlobalEvents() {
        // 点击外部关闭面板
        document.addEventListener('click', function (event) {
            if (!emojiPanel || emojiPanel.style.display === 'none') return;

            if (!emojiPanel.contains(event.target) &&
                !event.target.classList.contains('emoji-trigger-btn')) {
                hide();
            }
        });

        // ESC键关闭面板
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && emojiPanel && emojiPanel.style.display !== 'none') {
                hide();
            }
        });

        // 窗口大小变化时重新定位
        window.addEventListener('resize', function () {
            if (emojiPanel && emojiPanel.style.display !== 'none' && currentActiveButton) {
                positionPanel(currentActiveButton);
            }
        });
    }

    /**
     * 创建emoji触发按钮
     */
    function createTriggerButton(containerClass, targetTextarea) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'emoji-trigger-btn';
        button.innerHTML = '😊';
        button.title = '选择表情';

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (currentActiveButton === this && emojiPanel.style.display !== 'none') {
                hide();
            } else {
                show(this, targetTextarea);
            }
        });

        return button;
    }

    /**
     * 将文本中的emoji标记转换为图片HTML
     */
    function convertEmojiMarkersToImages(text) {
        if (!text) return text;

        // 匹配emoji标记 [:emoji:数字:]
        return text.replace(/\[:emoji:(\d+):\]/g, function (match, index) {
            const imageSrc = EMOJI_CONFIG.basePath + EMOJI_CONFIG.filePattern.replace('{index}', index);
            return `<img src="${imageSrc}" alt="[表情${index}]" class="inline-emoji" style="width: 60px; height: 60px; vertical-align: middle; margin: 0 6px;">`;
        });
    }

    // 暴露公共接口
    window.EmojiSelector = {
        init: initEmojiSelector,
        show: show,
        hide: hide,
        createTriggerButton: createTriggerButton,
        convertToImages: convertEmojiMarkersToImages
    };

    // 自动初始化
    document.addEventListener('DOMContentLoaded', function () {
        // 延迟初始化，确保其他模块加载完成
        setTimeout(initEmojiSelector, 1000);
    });

})(); 