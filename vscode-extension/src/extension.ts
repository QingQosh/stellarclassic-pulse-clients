import * as vscode from 'vscode';
import { ApiExplorerProvider, EndpointItem } from './apiExplorer';
import { RequestTesterPanel } from './requestTester';
import { ApiEndpoint } from './types';
import { setApiKey, setAdminApiKey, clearApiKeys } from './apiKeyManager';
import { testWebhook } from './webhookTester';

export function activate(context: vscode.ExtensionContext): void {
    const explorer = new ApiExplorerProvider();

    // Tree view
    const treeView = vscode.window.createTreeView('stellarclassicpulse.apiExplorer', {
        treeDataProvider: explorer,
        showCollapseAll: true,
    });

    // Search/filter box above the tree
    const searchBox = vscode.window.createInputBox();
    searchBox.placeholder = 'Filter endpoints…';
    searchBox.onDidChangeValue(v => explorer.setFilter(v));

    // Commands
    context.subscriptions.push(
        treeView,

        vscode.commands.registerCommand('stellarclassicpulse.refreshExplorer', () => {
            explorer.setFilter('');
            explorer.refresh();
        }),

        vscode.commands.registerCommand('stellarclassicpulse.openRequestTester', (endpoint?: ApiEndpoint) => {
            RequestTesterPanel.open(context, endpoint);
        }),

        vscode.commands.registerCommand('stellarclassicpulse.copyUrl', async (item?: EndpointItem) => {
            if (!item) { return; }
            const base = vscode.workspace.getConfiguration('stellarclassicpulse').get<string>('baseUrl', 'http://localhost:3000');
            const url = base.replace(/\/$/, '') + item.endpoint.path;
            await vscode.env.clipboard.writeText(url);
            vscode.window.showInformationMessage(`Copied: ${url}`);
        }),

        vscode.commands.registerCommand('stellarclassicpulse.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'stellarclassicpulse');
        }),

        // Issue #963: secure API key management (SecretStorage-backed).
        vscode.commands.registerCommand('stellarclassicpulse.setApiKey', () => setApiKey(context)),
        vscode.commands.registerCommand('stellarclassicpulse.setAdminApiKey', () => setAdminApiKey(context)),
        vscode.commands.registerCommand('stellarclassicpulse.clearApiKeys', () => clearApiKeys(context)),

        // Issue #963: webhook test interface.
        vscode.commands.registerCommand('stellarclassicpulse.testWebhook', () => testWebhook()),
    );
}

export function deactivate(): void {
    // Nothing to clean up — disposables handled via context.subscriptions
}
