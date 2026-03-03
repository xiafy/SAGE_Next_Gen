# Tests Fixtures — 测试菜单图片说明

> 最后更新: 2026-03-03 | 管理: SAGE Agent

## 文件清单

| 文件名 | 语言 | 来源 | 用途 |
|--------|------|------|------|
| menu-thai-01.jpg | 泰文 | prompt-lab/real-thai（真实拍摄） | TC-001 主测试，含鱼类菜品 |
| menu-thai-02.jpg | 泰文 | prompt-lab/real-thai（真实拍摄） | TC-001 备用，主菜页 |
| menu-thai-03.jpg | 泰文 | prompt-lab/real-thai（真实拍摄） | TC-001 备用，主菜页2 |
| menu-japanese-01.jpg | 日文 | prompt-lab（居酒屋菜单） | TC-002 日料测试 |
| menu-chinese-01.jpg | 中文 | prompt-lab（中餐厅菜单） | TC-004 中餐测试 |
| menu-chinese-02.jpg | 中文 | Unsplash（餐厅场景） | TC-004 备用 |
| menu-spanish-01.jpg | 西班牙语 | prompt-lab/real-intl | TC-003 西班牙海鲜 |
| menu-spanish-02.jpg | 西班牙语 | prompt-lab（海鲜菜单） | TC-003 备用 |
| menu-english-01.jpg | 英文 | prompt-lab/real-intl（美国海鲜） | 英文菜单回归 |
| menu-english-02.jpg | 英文 | prompt-lab（美国海鲜） | 英文菜单备用 |
| menu-portuguese-01.jpg | 葡萄牙语 | prompt-lab（Coentro，含过敏源） | TC-005 过敏源测试 |
| menu-french-01.jpg | 通用（餐厅场景） | Unsplash | TC-003 法式备用 |
| menu-french-02.jpg | 通用（餐厅场景） | Unsplash | 西餐场景备用 |

**总计**: 13 张 | **覆盖文化**: 泰餐 / 日料 / 西班牙 / 中餐 / 葡萄牙 / 英文 / 西餐

## 图片质量要求

| 指标 | 最低要求 |
|------|---------|
| 分辨率 | ≥ 640px 短边 |
| 文件大小 | 30KB ~ 2MB |
| 格式 | JPEG / PNG |
| 菜品数量 | ≥ 5 道可识别菜品 |
| 价格信息 | 至少 50% 菜品含价格 |

## 图片分级

| 级别 | 说明 | 文件 |
|------|------|------|
| P0（核心）| 真实拍摄，高质量，必须通过 | menu-thai-01.jpg, menu-japanese-01.jpg, menu-portuguese-01.jpg |
| P1（补充）| 补充覆盖，应通过 | menu-thai-02/03.jpg, menu-chinese-01.jpg, menu-spanish-01/02.jpg |
| P2（边缘）| 场景图，用于 AI 容错测试 | menu-french-01/02.jpg, menu-chinese-02.jpg |

## 如何新增测试图片

1. 将图片放入本目录
2. 命名规则: `menu-{language}-{序号}.jpg`
   - 语言代码: thai / japanese / chinese / french / spanish / korean / italian / english / portuguese
3. 更新本 README 的文件清单
4. 在 `acceptance-e2e.md` 中对应 TC 的图片列表添加备注

## 注意事项

- ⚠️ **Wikimedia 会限速** (429)，直接下载需加延迟或使用 VPN
- ✅ **Unsplash** 提供餐厅场景图，适合 P2 级别测试
- ✅ **prompt-lab/test-images/** 下的真实菜单是 P0 级的黄金素材
- 禁止提交含个人隐私（人脸、收据）的图片
