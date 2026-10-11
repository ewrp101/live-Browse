/**
 * Agent 框架基础测试
 * 
 * 测试各个组件的基本功能
 */

const { test, expect } = require('@playwright/test');

test.describe('Autonomous Agent Framework', () => {
    
    test.describe('工具注册表', () => {
        test('应该能创建工具注册表', async () => {
            const ToolRegistry = require('../src/tools/registry');
            const registry = new ToolRegistry();
            
            expect(registry).toBeDefined();
            expect(registry.getToolNames()).toBeInstanceOf(Array);
        });

        test('应该能注册和调用工具', async () => {
            const ToolRegistry = require('../src/tools/registry');
            const registry = new ToolRegistry();
            
            registry.registerTool({
                name: 'test_tool',
                description: '测试工具',
                schema: {
                    value: { type: 'string', required: true }
                },
                handler: async (args) => {
                    return { received: args.value, success: true };
                }
            });
            
            const result = await registry.invokeTool('test_tool', { value: 'hello' }, {});
            
            expect(result.success).toBe(true);
            expect(result.result.received).toBe('hello');
        });
    });

    test.describe('LLM 适配器', () => {
        test('应该能创建 LLM 适配器（模拟模式）', async () => {
            const LLMAdapter = require('../src/agent/llm-adapter');
            const llm = new LLMAdapter({ provider: 'openai' });
            
            expect(llm).toBeDefined();
            expect(llm.provider).toBe('openai');
            
            const response = await llm.chat([
                { role: 'user', content: '你好' }
            ]);
            
            expect(response).toBeDefined();
        });

        test('应该能理解简单目标', async () => {
            const LLMAdapter = require('../src/agent/llm-adapter');
            const llm = new LLMAdapter({ provider: 'openai' });
            
            const understanding = await llm.understandGoal('登录到示例网站');
            
            expect(understanding).toBeDefined();
            expect(understanding.intent).toBeDefined();
        });
    });

    test.describe('Planner 规划器', () => {
        test('应该能创建计划', async () => {
            const LLMAdapter = require('../src/agent/llm-adapter');
            const Planner = require('../src/agent/planner');
            
            const llm = new LLMAdapter({ provider: 'openai' });
            const planner = new Planner(llm);
            
            const understanding = await llm.understandGoal('访问 example.com');
            const plan = await planner.createPlan(understanding);
            
            expect(plan).toBeDefined();
            expect(plan.scenario).toBeDefined();
            expect(plan.phases).toBeInstanceOf(Array);
        });
    });

    test.describe('Executor 执行器', () => {
        test('应该能记录执行指标', async () => {
            const Executor = require('../src/agent/executor');
            
            const mockBrowser = {};
            const mockToolRegistry = {
                invokeTool: async (name, args) => ({ success: true, result: args }),
                getToolNames: () => ['test_tool']
            };
            
            const executor = new Executor(mockBrowser, mockToolRegistry);
            
            const result = await executor.execute({
                action: 'test_tool',
                arguments: { value: 'test' }
            });
            
            expect(result.success).toBe(true);
            
            const metrics = executor.getMetrics();
            expect(metrics.totalActions).toBe(1);
        });
    });

    test.describe('Reflector 反思器', () => {
        test('应该能诊断错误', async () => {
            const LLMAdapter = require('../src/agent/llm-adapter');
            const Reflector = require('../src/agent/reflector');
            
            const llm = new LLMAdapter({ provider: 'openai' });
            const reflector = new Reflector(llm);
            
            const diagnosis = await reflector.diagnoseAndRecover(
                { action: 'browser_click', arguments: { selector: '#not-found' } },
                { success: false, error: 'Element not found' },
                { step: 1, errors: [] }
            );
            
            expect(diagnosis).toBeDefined();
            expect(diagnosis.diagnosis).toBeDefined();
        });
    });

    test.describe('AgentMemory 记忆系统', () => {
        test('应该能创建 memory 实例', async () => {
            const AgentMemory = require('../src/memory/episode-memory');
            const memory = new AgentMemory({ 
                enabled: true,
                memoryDir: './test-memory'
            });
            
            expect(memory).toBeDefined();
            expect(memory.options.enabled).toBe(true);
        });

        test('应该能记录 episode', async () => {
            const AgentMemory = require('../src/memory/episode-memory');
            const memory = new AgentMemory({ 
                enabled: true,
                memoryDir: './test-memory'
            });
            
            const episodeId = memory.startEpisode('测试目标');
            expect(episodeId.id).toBeDefined();
            
            memory.recordStep({
                action: 'browser_navigate',
                arguments: { url: 'https://example.com' },
                result: { success: true }
            });
            
            memory.endEpisode({ success: true, summary: '测试完成' });
            
            const stats = memory.getStats();
            expect(stats.totalEpisodes).toBeGreaterThanOrEqual(1);
            
            memory.clear();
        });
    });

    test.describe('配置加载', () => {
        test('应该能加载配置文件', async () => {
            const config = require('../agent.config');
            
            expect(config).toBeDefined();
            expect(config.llm).toBeDefined();
        });
    });

    test.describe('主入口', () => {
        test('应该能导出所有核心类', async () => {
            const index = require('../src/index');
            
            expect(index.AutonomousAgent).toBeDefined();
            expect(index.LLMAdapter).toBeDefined();
            expect(index.createAgent).toBeDefined();
        });
    });
});
