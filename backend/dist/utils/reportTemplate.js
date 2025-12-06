"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportHtml = void 0;
const handlebars_1 = __importDefault(require("handlebars"));
const generateReportHtml = (data) => {
    const template = `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <title>{{title}}</title> 
        <style>
            body { font-family: 'Arial', sans-serif; color: #1f2937; margin: 0; padding: 0; }
            
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #ff6b35; padding-bottom: 20px; }
            .header h1 { color: #1a3a5c; margin: 0; font-size: 28px; }
            .meta { color: #6b7280; font-size: 14px; margin-top: 10px; }
            
            .section { margin-bottom: 40px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; color: #1a3a5c; margin-bottom: 15px; border-left: 4px solid #ff6b35; padding-left: 10px; }
            
            .kpi-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 10px; }
            .kpi-card { background: #f3f4f6; padding: 15px; border-radius: 8px; width: 22%; text-align: center; }
            .kpi-value { font-size: 20px; font-weight: bold; color: #1a3a5c; margin-bottom: 5px; }
            .kpi-label { font-size: 12px; color: #4b5563; text-transform: uppercase; }

            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; } /* Це повторить шапку таблиці на новій сторінці */
            tfoot { display: table-footer-group; }
            
            th { text-align: left; background: #e5e7eb; padding: 12px; color: #374151; font-weight: bold; }
            td { border-bottom: 1px solid #e5e7eb; padding: 10px; }
            tr:nth-child(even) { background-color: #f9fafb; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Звіт ефективності</h1>
            <div class="meta">
                Період: {{period}}<br>
                Сформовано: {{generatedAt}}<br>
                Сформував: {{managerName}}
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-value">{{totalRevenue}}</div>
                <div class="kpi-label">Дохід</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{{totalOrders}}</div>
                <div class="kpi-label">Замовлень</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{{averageOrderValue}}</div>
                <div class="kpi-label">Середній чек</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-value">{{cancelRate}}%</div>
                <div class="kpi-label">Відмов</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Топ послуг за доходом</div>
            <table>
                <thead>
                    <tr>
                        <th>Послуга</th>
                        <th style="text-align: center;">Кількість</th>
                        <th style="text-align: right;">Дохід</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each topServices}}
                    <tr>
                        <td>{{name}}</td>
                        <td style="text-align: center;">{{count}}</td>
                        <td style="text-align: right;">{{revenue}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Найактивніші клієнти</div>
            <table>
                <thead>
                    <tr>
                        <th>Ім'я</th>
                        <th>Email</th>
                        <th style="text-align: center;">Замовлень</th>
                        <th style="text-align: right;">Витрати</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each topClients}}
                    <tr>
                        <td>{{first_name}} {{last_name}}</td>
                        <td>{{email}}</td>
                        <td style="text-align: center;">{{orders_count}}</td>
                        <td style="text-align: right;">{{total_spent}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Використання ресурсів</div>
            <table>
                <thead>
                    <tr>
                        <th>Ресурс</th>
                        <th>Тип</th>
                        <th style="text-align: center;">Використань</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each topResources}}
                    <tr>
                        <td>{{name}}</td>
                        <td>{{type}}</td>
                        <td style="text-align: center;">{{usage_count}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <div class="footer">
            Рекламне Агентство &bull; Внутрішній документ &bull; Конфіденційно
        </div>
    </body>
    </html>
    `;
    const compiled = handlebars_1.default.compile(template);
    return compiled(data);
};
exports.generateReportHtml = generateReportHtml;
