// 应用主类
class CoupleMenuApp {
    constructor() {
        this.currentMode = 'viewer';
        this.orderItems = JSON.parse(localStorage.getItem('orderItems')) || [];
        this.orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
        this.menuItems = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadMenu();
        await this.loadOrders();
        this.renderOrder();
        this.renderOrderHistory();
        this.updateModeUI();
    }

    async loadOrders() {
        try {
            const stored = localStorage.getItem('orderHistory');
            this.orderHistory = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('加载订单失败:', e);
            this.orderHistory = [];
        }
    }

    async submitOrder() {
        if (this.orderItems.length === 0) {
            this.showNotification('点餐篮为空');
            return;
        }
        try {
            const orderRecord = {
                id: Date.now().toString(),
                items: [...this.orderItems],
                total: this.calculateTotal(),
                timestamp: new Date().toISOString()
            };
            
            // 推送到微信（Server酱）
            await this.sendWeChatNotification(orderRecord);
            
            this.orderHistory.unshift(orderRecord);
            this.saveOrderHistoryToStorage();
            this.orderItems = [];
            this.saveOrderToStorage();
            this.renderOrder();
            document.getElementById('checkout-modal').style.display = 'none';
            this.showNotification('点餐成功！祝您用餐愉快！');
            if (this.currentMode === 'manager') {
                this.renderOrderHistory();
            }
        } catch (error) {
            this.showNotification('点餐失败: ' + error.message);
        }
    }

    // 新增：发送微信推送（Server酱）
    async sendWeChatNotification(orderRecord) {
        const sendKey = 'SCT292728TIqkPVfV8adrJKzcIsfbsemGy';
        
        try {
            // 构建 Markdown 格式的推送内容
            const orderDate = new Date(orderRecord.timestamp).toLocaleString('zh-CN');
            let desp = `## 📋 点餐详情\n\n`;
            desp += `**订单号：** ${orderRecord.id.substring(0, 8)}\n`;
            desp += `**下单时间：** ${orderDate}\n\n`;
            desp += `### 🍽️ 菜品清单\n\n`;
            desp += `| 菜品名称 | 数量 | 单价 | 小计 |\n`;
            desp += `|---------|------|------|------|\n`;
            
            orderRecord.items.forEach(item => {
                const subtotal = (item.price * item.quantity).toFixed(2);
                desp += `| ${item.dish_name} | ${item.quantity} | ¥${item.price.toFixed(2)} | ¥${subtotal} |\n`;
            });
            
            desp += `\n**💰 订单总计：¥${orderRecord.total.toFixed(2)}**\n\n`;
            desp += `---\n📱 来自宁宝专用点餐系统`;
            
            // 发送推送请求（表单方式，避免预检）
            const url = `https://sctapi.ftqq.com/${sendKey}.send`;
            const form = new URLSearchParams();
            form.append('title', `🛎️ 新订单提醒 #${orderRecord.id.substring(0, 8)}`);
            form.append('desp', desp);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
                },
                body: form.toString()
            });
            
            const result = await response.json();
            
            if (result.code === 0) {
                this.showNotification('订单已推送到微信！');
            } else {
                console.error('微信推送失败:', result);
                this.showNotification('微信推送失败，但订单已保存');
            }
        } catch (error) {
            console.error('微信推送异常:', error);
            this.showNotification('微信推送异常，但订单已保存');
        }
    }
    deleteOrderRecord(recordId) {
        if (this.currentMode !== 'manager') {
            this.showNotification('请切换到管理者模式');
            return;
        }
        this.orderHistory = this.orderHistory.filter(record => record.id !== recordId);
        this.saveOrderHistoryToStorage();
        this.renderOrderHistory();
        this.showNotification('点餐记录已删除');
    }

    // 加载菜单数据
    async loadMenu() {
        try {
            const localMenu = localStorage.getItem('sharedMenu');
            if (localMenu) {
                this.menuItems = JSON.parse(localMenu);
            } else {
                this.menuItems = this.getDefaultMenu();
                localStorage.setItem('sharedMenu', JSON.stringify(this.menuItems));
            }
        } catch (error) {
            console.error('加载菜单失败:', error);
            this.menuItems = this.getDefaultMenu();
        }
        this.renderMenu();
    }
    
    // 获取默认菜单
    getDefaultMenu() {
        return [
            {
                id: '1',
                name: "爱心煎蛋",
                price: 0.50,
                description: "心形煎蛋，充满爱意的早餐",
                steps: "1. 热锅冷油，打入鸡蛋。\n2. 用模具或锅铲塑成心形。\n3. 小火慢煎，撒上盐和胡椒。",
                image: './image/1.png'
            },
            {
                id: '2',
                name: "草莓饼干",
                price: 0.80,
                description: "新鲜草莓制作的美味饼干",
                steps: "1. 黄油软化，加糖打发。\n2. 筛入面粉，拌入草莓丁。\n3. 烤箱预热180度，烤15分钟。",
                image: './image/2.png'
            },

            {
                id: '3',
                name: "水果沙拉",
                price: 0.75,
                description: "新鲜时令水果搭配",
                steps: "1. 将各种水果切块。\n2. 淋上酸奶或沙拉酱。\n3. 轻轻拌匀即可。",
                image: './image/3.png'
            },
            {
                id: '4',            
                name: "奶香小馒头",
                price: 0.30,
                description: "松软香甜的小馒头",
                steps: "1. 面粉、酵母、牛奶混合。\n2. 揉成光滑面团，发酵。\n3. 整形后烤箱蒸15分钟。",
                image: './image/4.png'
            },
            {
                id: '5',
                name: "蜂蜜柚子茶",
                price: 0.60,
                description: "温润去燥的蜂蜜柚子茶",
                steps: "1. 柚子用盐搓洗干净。\n2. 剥出果肉，切丝。\n3. 与冰糖同煮，冷却后加蜂蜜。",
                image: './image/5.png'
            },
            {
                id: '6',
                name: "电饭煲闷饭",
                price: 0.50,
                description: "香浓入味的电饭煲闷饭",
                steps: "1. 将大米淘洗干净，放入电饭煲。\n2. 加入适量水，选择煮饭模式。\n3. 等待电饭煲提示，即可享用。",
                image: "./image/6.png"
            },
            {
                id: '7',
                name: "铁板豆腐",
                price: 0.80,
                description: "外酥里嫩的铁板豆腐，香气四溢",
                steps: "1. 豆腐切厚片，用厨房纸吸干水分。\n2. 热铁板或平底锅，倒少许油。\n3. 将豆腐煎至两面金黄。\n4. 加入调味酱汁，小火收汁入味。\n5. 撒葱花或芝麻点缀。",
                image: "./image/7.jpg"
            },
            {
                id: '8',
                name: "洋葱炒牛肉",
                price: 0.80,
                description: "鲜嫩多汁的牛肉配上香甜洋葱，热腾腾的铁板香气扑鼻",
                steps: "1. 牛肉切片,用酱油、料酒、淀粉腌制15分钟。\n2. 洋葱切丝备用。\n3. 热铁板或平底锅，倒少许油。\n4. 大火快炒牛肉至变色，盛出备用。\n5. 洋葱丝炒香后加入牛肉，倒入调味汁。\n6. 小火收汁，撒葱花装盘上桌。",
                image: "./image/8.jpg"
            }
        ];
    }
    
    // 添加菜品到本地存储
    async addMenuItem(item) {
        try {
            const id = Date.now().toString();
            const newItem = { id, ...item };
            this.menuItems.push(newItem);
            localStorage.setItem('sharedMenu', JSON.stringify(this.menuItems));
            this.renderMenu();
            return newItem;
        } catch (error) {
            console.error('Failed to add menu item:', error);
            throw error;
        }
    }
    
    // 删除菜品
    async deleteMenuItem(id) {
        try {
            this.menuItems = this.menuItems.filter(item => item.id != id);
            localStorage.setItem('sharedMenu', JSON.stringify(this.menuItems));
            this.renderMenu();
        } catch (error) {
            console.error('Failed to delete menu item:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // 模式切换
        const toggleModeBtn = document.getElementById('toggle-mode');
        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', () => this.toggleMode());
        }
        
        // 添加菜品
        const addDishBtn = document.getElementById('add-dish-btn');
        if (addDishBtn) {
            addDishBtn.addEventListener('click', () => {
                if (this.currentMode === 'manager') {
                    document.getElementById('add-dish-modal-title').textContent = '添加新菜品';
                    document.getElementById('add-dish-form').reset();
                    document.getElementById('dish-id').value = '';
                    document.getElementById('add-dish-modal').style.display = 'block';
                } else {
                    this.showNotification('请切换到管理者模式');
                }
            });
        }
        
        // 表单提交
        const addDishForm = document.getElementById('add-dish-form');
        if (addDishForm) {
            addDishForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddDish();
            });
        }
        
        // 关闭模态框
        const closeButtons = document.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
        
        // 取消按钮
        const cancelAddDish = document.getElementById('cancel-add-dish');
        if (cancelAddDish) {
            cancelAddDish.addEventListener('click', () => {
                document.getElementById('add-dish-modal').style.display = 'none';
            });
        }
        
        const cancelCheckout = document.getElementById('cancel-checkout');
        if (cancelCheckout) {
            cancelCheckout.addEventListener('click', () => {
                document.getElementById('checkout-modal').style.display = 'none';
            });
        }
        
        // 点击模态框外部关闭
        window.addEventListener('click', (event) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // 查看做法步骤
        document.getElementById('menu-grid').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-steps-btn')) {
                const dishId = e.target.dataset.id;
                this.showStepsModal(dishId);
            }
        });

        // 关闭做法步骤模态框
        document.getElementById('close-steps-modal').addEventListener('click', () => {
            document.getElementById('steps-modal').style.display = 'none';
        });

        // 切换到编辑做法步骤模式
        document.getElementById('edit-steps-btn').addEventListener('click', () => {
            document.getElementById('steps-view-mode').style.display = 'none';
            document.getElementById('steps-edit-mode').style.display = 'block';
            const steps = document.getElementById('steps-text').textContent;
            document.getElementById('edit-steps-textarea').value = steps;
        });

        // 保存做法步骤
        document.getElementById('save-steps-btn').addEventListener('click', () => {
            const dishId = document.getElementById('steps-modal').dataset.dishId;
            const newSteps = document.getElementById('edit-steps-textarea').value;
            this.updateDishSteps(dishId, newSteps);
        });

        // 取消编辑做法步骤
        document.getElementById('cancel-edit-steps-btn').addEventListener('click', () => {
            document.getElementById('steps-modal').style.display = 'none';
        });
        
        // 确认点餐
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (this.orderItems.length === 0) {
                    this.showNotification('请先添加菜品到点餐篮');
                    return;
                }
                this.renderCheckout();
                document.getElementById('checkout-modal').style.display = 'block';
            });
        }
        
        // 确认点餐提交
        const confirmCheckout = document.getElementById('confirm-checkout');
        if (confirmCheckout) {
            confirmCheckout.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const originalText = btn && btn.textContent ? btn.textContent : '确认点餐';
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '正在推送...';
                }
                try {
                    await this.submitOrder();
                } finally {
                    if (btn) {
                        btn.disabled = false;
                        btn.textContent = originalText;
                    }
                }
            });
        }
        
        // 图片上传相关事件
        this.setupImageUploadListeners();
    }
    
    setupImageUploadListeners() {
        const imagePreview = document.getElementById('image-preview');
        const dishImageInput = document.getElementById('dish-image');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewImage = document.getElementById('preview-image');
        const removeImageBtn = document.getElementById('remove-image-btn');
        
        // 点击预览区域触发文件选择
        if (imagePreview) {
            imagePreview.addEventListener('click', () => {
                if (dishImageInput && !previewImage.style.display !== 'none') {
                    dishImageInput.click();
                }
            });
        }
        
        // 文件选择变化
        if (dishImageInput) {
            dishImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImageUpload(file);
                }
            });
        }
        
        // 删除图片
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeImage();
            });
        }
    }
    
    async handleImageUpload(file) {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            this.showNotification('请选择图片文件');
            return;
        }
        
        // 检查文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('图片文件不能超过10MB');
            return;
        }
        
        // 保存图片到本地 image 文件夹并获取访问URL
        const imageUrl = await this.saveImageLocally(file);
        
        // 更新预览界面
        this.updateImagePreview(imageUrl);
        
        // 存储图片URL供后续使用
        this.currentImageUrl = imageUrl;
    }
    
    // 新增：将图片保存到本地image文件夹
    async saveImageLocally(file) {
        try {
            // 生成唯一文件名
            const timestamp = Date.now();
            const extension = file.name.split('.').pop() || 'jpg';
            const fileName = `img_${timestamp}.${extension}`;
            
            // 创建相对路径URL供前端使用
            const imageUrl = `./image/${fileName}`;
            
            // 在前端环境中，我们使用URL.createObjectURL创建临时URL
            // 实际保存需要后端支持，这里使用Blob URL作为临时方案
            const blobUrl = URL.createObjectURL(file);
            
            // 尝试通过下载链接方式"保存"到image文件夹
            // 注意：纯前端无法直接写入文件系统，这里提供下载提示
            this.downloadImageToFolder(file, fileName);
            
            // 返回blob URL用于预览
            return blobUrl;
        } catch (error) {
            console.error('图片保存失败:', error);
            this.showNotification('图片保存失败，使用临时预览');
            return URL.createObjectURL(file);
        }
    }
    
    // 提供图片下载功能，用户需要手动保存到image文件夹
    downloadImageToFolder(file, fileName) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // 提示用户保存位置
        setTimeout(() => {
            this.showNotification(`请将图片保存到 image 文件夹中: ${fileName}`);
            link.click();
            document.body.removeChild(link);
        }, 100);
    }
    
    updateImagePreview(imageUrl) {
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewImage = document.getElementById('preview-image');
        const removeImageBtn = document.getElementById('remove-image-btn');
        
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
        if (previewImage) {
            previewImage.src = imageUrl;
            previewImage.style.display = 'block';
        }
        if (removeImageBtn) removeImageBtn.style.display = 'block';
    }
    
    removeImage() {
        const dishImageInput = document.getElementById('dish-image');
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewImage = document.getElementById('preview-image');
        const removeImageBtn = document.getElementById('remove-image-btn');
        
        if (dishImageInput) dishImageInput.value = '';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        if (previewImage) {
            previewImage.src = '';
            previewImage.style.display = 'none';
        }
        if (removeImageBtn) removeImageBtn.style.display = 'none';
        
        // 清除当前图片URL
        this.currentImageUrl = null;
    }
    
    async handleAddDish() {
        if (this.currentMode !== 'manager') {
            this.showNotification('请切换到管理者模式');
            return;
        }
        
        const name = document.getElementById('dish-name').value;
        const price = parseFloat(document.getElementById('dish-price').value);
        const description = document.getElementById('dish-description').value;
        const steps = document.getElementById('dish-steps').value;
        const dishId = document.getElementById('dish-id').value;
        
        // 获取图片数据
        // 使用存储的图片URL
        const image = this.currentImageUrl || null;

        try {
            if (dishId) {
                // 更新现有菜品
                await this.updateMenuItem(dishId, { name, price, description, steps, image });
                this.showNotification(`成功更新菜品: ${name}`);
            } else {
                // 添加新菜品
                await this.addMenuItem({ name, price, description, steps, image });
                this.showNotification(`成功添加菜品: ${name}`);
            }
            this.resetForm();
            document.getElementById('add-dish-modal').style.display = 'none';
        } catch (error) {
            this.showNotification('操作失败: ' + error.message);
        }
    }

    editMenuItem(id) {
        const item = this.menuItems.find(item => item.id == id);
        if (!item) return;

        document.getElementById('add-dish-modal-title').textContent = '编辑菜品';
        document.getElementById('dish-id').value = item.id;
        document.getElementById('dish-name').value = item.name;
        document.getElementById('dish-price').value = item.price;
        document.getElementById('dish-description').value = item.description;
        // 处理steps字段的不同数据类型
        const stepsValue = typeof item.steps === 'string' ? item.steps : 
                          Array.isArray(item.steps) ? item.steps.join('\n') : 
                          item.steps ? item.steps.toString() : '';
        document.getElementById('dish-steps').value = stepsValue;
        
        // 设置图片预览和currentImageUrl
        this.currentImageUrl = item.image || null;
        
        const uploadPlaceholder = document.getElementById('upload-placeholder');
        const previewImage = document.getElementById('preview-image');
        const removeImageBtn = document.getElementById('remove-image-btn');
        
        if (item.image) {
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            if (previewImage) {
                previewImage.src = item.image;
                previewImage.style.display = 'block';
            }
            if (removeImageBtn) removeImageBtn.style.display = 'block';
        } else {
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            if (previewImage) {
                previewImage.src = '';
                previewImage.style.display = 'none';
            }
            if (removeImageBtn) removeImageBtn.style.display = 'none';
        }
        
        document.getElementById('add-dish-modal').style.display = 'block';
    }

    async updateMenuItem(id, updatedData) {
        try {
            const itemIndex = this.menuItems.findIndex(item => item.id == id);
            if (itemIndex === -1) {
                throw new Error('菜品未找到');
            }
            this.menuItems[itemIndex] = { ...this.menuItems[itemIndex], ...updatedData };
            localStorage.setItem('sharedMenu', JSON.stringify(this.menuItems));
            this.renderMenu();
        } catch (error) {
            console.error('更新菜品失败:', error);
            this.showNotification('更新菜品失败：' + error.message);
        }
    }
    
    async deleteDish(id) {
        if (this.currentMode !== 'manager') {
            this.showNotification('请切换到管理者模式');
            return;
        }
        
        try {
            await this.deleteMenuItem(id);
            this.showNotification('菜品删除成功');
        } catch (error) {
            this.showNotification('删除菜品失败: ' + error.message);
        }
    }
    
    toggleMode() {
        this.currentMode = this.currentMode === 'manager' ? 'viewer' : 'manager';
        // 移除持久化：不再写入 localStorage 的 coupleMenuMode
        this.updateModeUI();
    }
    
    updateModeUI() {
        const viewerSection = document.querySelector('.viewer-section');
        const managerSection = document.querySelector('.manager-section');
        const addDishBtn = document.getElementById('add-dish-btn');
        const toggleModeBtn = document.getElementById('toggle-mode');
        
        if (this.currentMode === 'manager') {
            if (addDishBtn) addDishBtn.style.display = 'block';
            if (toggleModeBtn) toggleModeBtn.innerHTML = '<i class="fas fa-user"></i> 浏览模式';
            document.body.classList.add('manager-mode');
            
            if (viewerSection) viewerSection.style.display = 'none';
            if (managerSection) managerSection.style.display = 'block';
            
            // 切换到管理者模式时渲染点餐记录
            this.renderOrderHistory();
        } else {
            if (addDishBtn) addDishBtn.style.display = 'none';
            if (toggleModeBtn) toggleModeBtn.innerHTML = '<i class="fas fa-user-shield"></i> 管理模式';
            document.body.classList.remove('manager-mode');
            
            if (viewerSection) viewerSection.style.display = 'block';
            if (managerSection) managerSection.style.display = 'none';
        }
        
        // 立即重新渲染菜单以反映模式变化
        this.renderMenu();
    }
    
    renderMenu() {
        const menuGrid = document.getElementById('menu-grid');
        if (!menuGrid) return;
        
        // 移除加载指示器
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        menuGrid.innerHTML = '';
        
        this.menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            const isManager = this.currentMode === 'manager';

            let buttonsHtml = '';
            if (isManager) {
                buttonsHtml = `
                    <div class="button-group">
                        <button class="edit-dish" data-id="${item.id}">
                            编辑
                        </button>
                        <button class="delete-dish" data-id="${item.id}">
                            删除
                        </button>
                    </div>
                `;
            } else {
                buttonsHtml = `
                    <button class="add-to-order" data-id="${item.id}">
                        添加
                    </button>
                `;
            }
            
            // 做法步骤显示逻辑
            const stepsHtml = `
                <div class="item-steps">
                    <p class="steps-preview">${item.steps ? (typeof item.steps === 'string' ? item.steps.substring(0, 30) : (Array.isArray(item.steps) ? item.steps.join(' ').substring(0, 30) : item.steps.toString().substring(0, 30))) + '...' : '暂无做法'}</p>
                    ${isManager ? `<button class="view-steps-btn" data-id="${item.id}">查看详情</button>` : ''}
                </div>
            `;
            
            // 图片显示逻辑
            const imageHtml = item.image ? 
                `<img src="${item.image}" alt="${item.name}" class="dish-image">` : 
                `<div class="default-image"><i class="fas fa-utensils"></i></div>`;
            
            menuItem.innerHTML = `
                <div class="item-image">
                    ${imageHtml}
                </div>
                <div class="item-info">
                    <div class="item-header">
                        <h3 class="item-name">${item.name}</h3>
                        <div class="item-price">¥${item.price.toFixed(2)}</div>
                    </div>
                    <p class="item-description">${item.description}</p>
                    ${stepsHtml}
                    ${buttonsHtml}
                </div>
            `;
            
            menuGrid.appendChild(menuItem);
        });
        
        // 使用事件委托处理按钮点击
        const menuGridElement = document.getElementById('menu-grid');
        
        // 移除之前的事件监听器
        const newMenuGrid = menuGridElement.cloneNode(true);
        menuGridElement.parentNode.replaceChild(newMenuGrid, menuGridElement);
        
        // 添加事件委托
        newMenuGrid.addEventListener('click', (e) => {
            const target = e.target;
            const id = target.dataset.id;
            
            if (target.classList.contains('add-to-order')) {
                this.addToOrder(id);
            } else if (target.classList.contains('view-steps-btn')) {
                this.showStepsModal(id);
            } else if (target.classList.contains('edit-dish')) {
                this.editMenuItem(id);
            } else if (target.classList.contains('delete-dish')) {
                if (confirm('确定要删除这道菜吗？')) {
                    this.deleteDish(id);
                }
            }
        });
    }
    
    addToOrder(itemId) {
        const menuItem = this.menuItems.find(item => item.id == itemId);
        if (!menuItem) return;
        
        const existingItem = this.orderItems.find(item => item.dish_id == itemId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.orderItems.push({
                id: Date.now(),
                dish_id: menuItem.id,
                dish_name: menuItem.name,
                price: menuItem.price,
                quantity: 1
            });
        }
        
        this.saveOrderToStorage();
        this.renderOrder();
        this.showNotification(`已添加 ${menuItem.name}`);
    }

    showStepsModal(dishId) {
        const item = this.menuItems.find(item => item.id == dishId);
        if (!item) return;

        const modal = document.getElementById('steps-modal');
        modal.dataset.dishId = dishId;

        document.getElementById('steps-dish-name').textContent = item.name;
        
        // 处理steps字段的不同数据类型
        const stepsText = typeof item.steps === 'string' ? item.steps : 
                         Array.isArray(item.steps) ? item.steps.join('\n') : 
                         item.steps ? item.steps.toString() : '暂无做法';
        
        document.getElementById('steps-text').textContent = stepsText;
        document.getElementById('edit-steps-textarea').value = stepsText;

        const viewMode = document.getElementById('steps-view-mode');
        const editMode = document.getElementById('steps-edit-mode');
        const editBtn = document.getElementById('edit-steps-btn');

        if (this.currentMode === 'manager') {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.style.display = 'inline-block';
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            editBtn.style.display = 'none';
        }

        modal.style.display = 'block';
    }

    updateDishSteps(dishId, newSteps) {
        const itemIndex = this.menuItems.findIndex(item => item.id == dishId);
        if (itemIndex > -1) {
            this.menuItems[itemIndex].steps = newSteps;
            localStorage.setItem('sharedMenu', JSON.stringify(this.menuItems));
            this.renderMenu();
            this.showNotification('做法步骤已更新');
            document.getElementById('steps-modal').style.display = 'none';
        }
    }
    
    renderOrder() {
        const orderItemsContainer = document.getElementById('order-items');
        const totalPriceElement = document.getElementById('total-price');
        if (!orderItemsContainer) return;
        
        if (this.orderItems.length === 0) {
            orderItemsContainer.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-shopping-basket fa-3x"></i>
                    <p>点餐篮是空的</p>
                    <p>添加一些美食吧！</p>
                </div>
            `;
            if (totalPriceElement) {
                totalPriceElement.textContent = '¥0.00';
            }
            return;
        }
        
        orderItemsContainer.innerHTML = '';
        
        this.orderItems.forEach(item => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div class="item-details">
                    <h4>${item.dish_name}</h4>
                    <p>¥${item.price.toFixed(2)}</p>
                </div>
                <div class="item-total-price">¥${(item.price * item.quantity).toFixed(2)}</div>
                <div class="quantity-controls">
                    <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn increase" data-id="${item.id}">+</button>
                </div>
                <button class="remove-item" data-id="${item.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            orderItemsContainer.appendChild(orderItem);
        });
        
        // 添加事件监听器
        document.querySelectorAll('.decrease').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.updateQuantity(id, -1);
            });
        });
        
        document.querySelectorAll('.increase').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.updateQuantity(id, 1);
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.removeFromOrder(id);
            });
        });
        
        if (totalPriceElement) {
            totalPriceElement.textContent = `¥${this.calculateTotal().toFixed(2)}`;
        }
    }
    
    updateQuantity(itemId, change) {
        const item = this.orderItems.find(item => item.id === itemId);
        if (!item) return;
        
        item.quantity += change;
        
        if (item.quantity <= 0) {
            this.orderItems = this.orderItems.filter(item => item.id !== itemId);
        }
        
        this.saveOrderToStorage();
        this.renderOrder();
    }
    
    removeFromOrder(itemId) {
        this.orderItems = this.orderItems.filter(item => item.id !== itemId);
        this.saveOrderToStorage();
        this.renderOrder();
    }
    
    calculateTotal() {
        return this.orderItems.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }
    
    saveOrderToStorage() {
        localStorage.setItem('orderItems', JSON.stringify(this.orderItems));
    }
    
    resetForm() {
        const form = document.getElementById('add-dish-form');
        if (form) {
            form.reset();
        }
        
        // 重置图片预览
        this.removeImage();
        
        // 清除当前图片URL
        this.currentImageUrl = null;
        
        // 重置模态框标题
        document.getElementById('add-dish-modal-title').textContent = '添加菜品';
        document.getElementById('dish-id').value = '';
    }
    
    renderCheckout() {
        const checkoutItems = document.getElementById('checkout-items');
        const checkoutTotalPrice = document.getElementById('checkout-total-price');
        if (!checkoutItems) return;
        
        checkoutItems.innerHTML = '';
        
        this.orderItems.forEach(item => {
            const checkoutItem = document.createElement('div');
            checkoutItem.className = 'checkout-item';
            checkoutItem.innerHTML = `
                <div>
                    <div class="checkout-item-name">${item.dish_name}</div>
                    <div class="checkout-item-price">¥${item.price.toFixed(2)} x ${item.quantity}</div>
                </div>
                <div>¥${(item.price * item.quantity).toFixed(2)}</div>
            `;
            checkoutItems.appendChild(checkoutItem);
        });
        
        if (checkoutTotalPrice) {
            checkoutTotalPrice.textContent = `¥${this.calculateTotal().toFixed(2)}`;
        }
    }
    

    
    saveOrderHistoryToStorage() {
        localStorage.setItem('orderHistory', JSON.stringify(this.orderHistory));
    }
    
    renderOrderHistory() {
        const orderHistoryList = document.getElementById('order-history-list');
        if (!orderHistoryList) return;
        
        if (this.orderHistory.length === 0) {
            orderHistoryList.innerHTML = `
                <div class="empty-order">
                    <i class="fas fa-history fa-3x"></i>
                    <p>暂无点餐记录</p>
                </div>
            `;
            return;
        }
        
        orderHistoryList.innerHTML = '';
        
        this.orderHistory.forEach(record => {
            const orderElement = document.createElement('div');
            orderElement.className = 'history-item';
            
            const orderDate = new Date(record.timestamp);
            const formattedDate = orderDate.toLocaleString('zh-CN');
            
            let itemsHtml = '';
            record.items.forEach(item => {
                itemsHtml += `
                    <div class="history-item-detail">
                        <span>${item.dish_name}</span>
                        <span>¥${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `;
            });
            
            orderElement.innerHTML = `
                <div class="history-item-header">
                    <div>
                        <strong>订单 #${record.id.substring(0, 8)}</strong>
                        <div class="history-item-date">${formattedDate}</div>
                    </div>
                    <div class="history-item-total">¥${record.total.toFixed(2)}</div>
                </div>
                <div class="history-item-details">
                    ${itemsHtml}
                </div>
                ${this.currentMode === 'manager' ? 
                    `<button class="delete-history-btn" data-id="${record.id}">
                        <i class="fas fa-trash"></i> 删除记录
                    </button>` : ''}
            `;
            
            orderHistoryList.appendChild(orderElement);
        });
        
        // 添加删除记录事件（仅管理者模式）
        if (this.currentMode === 'manager') {
            document.querySelectorAll('.delete-history-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const recordId = e.currentTarget.dataset.id;
                    this.deleteOrderRecord(recordId);
                });
            });
        }
    }
    

    
    showNotification(message) {
        // 移除现有的通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 创建新通知
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 3秒后移除通知
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.coupleMenuApp = new CoupleMenuApp();
});