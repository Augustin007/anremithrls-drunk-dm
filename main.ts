import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from 'obsidian';

interface DrunkDMSettings {
    currentFile: string;
}

const DEFAULT_SETTINGS: DrunkDMSettings = {
    currentFile: 'session'
}

export default class DrunkDM extends Plugin {
    settings: DrunkDMSettings;

    async onload() {
        console.log('loading plugin Drunk DM');

        await this.loadSettings();

        console.log('Settings loaded:', this.settings);

        // Add a ribbon icon with a dice button
        this.addRibbonIcon('dice', 'Roll Dice', async () => {
            const diceInput = await this.promptForDice();
            if (diceInput) {
                const rollResult = this.rollDice(diceInput);
                await this.addToCurrentFile(`Rolled ${diceInput}: ${rollResult}`);
                new Notice(`Rolled ${diceInput}: ${rollResult}`);
            }
        });

        // Add settings tab
        this.addSettingTab(new DrunkDMSettingTab(this.app, this));

        console.log('Ribbon icon and settings tab added.');
    }

    onunload() {
        console.log('unloading plugin Drunk DM');
    }

    async promptForDice(): Promise<string | null> {
        return new Promise((resolve) => {
            const prompt = new DicePrompt(this.app, resolve);
            prompt.open();
        });
    }

    rollDice(dice: string): number {
        console.log('Rolling dice:', dice);
        const [num, sides] = dice.split('d').map(Number);
        let total = 0;
        for (let i = 0; i < num; i++) {
            total += Math.floor(Math.random() * sides) + 1;
        }
        console.log('Roll result:', total);
        return total;
    }

    async addToCurrentFile(content: string) {
        const { vault } = this.app;
        const filePath = `${this.settings.currentFile}.md`;
        const file = vault.getAbstractFileByPath(filePath);

        if (file instanceof TFile) {
            const data = await vault.read(file);
            await vault.modify(file, `${data}\n${content}`);
            console.log('Content added to file:', filePath);
        } else {
            new Notice(`File ${filePath} not found`);
            console.error('File not found:', filePath);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        console.log('Settings loaded:', this.settings);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        console.log('Settings saved:', this.settings);
    }
}

class DicePrompt extends Modal {
    callback: (result: string | null) => void;

    constructor(app: App, callback: (result: string | null) => void) {
        super(app);
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Enter Dice Roll (e.g., 1d6, 2d10)' });

        const inputEl = contentEl.createEl('input', { type: 'text' });
        inputEl.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.close();
                this.callback(inputEl.value);
            }
        });

        const buttonEl = contentEl.createEl('button', { text: 'Roll' });
        buttonEl.addEventListener('click', () => {
            this.close();
            this.callback(inputEl.value);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.callback(null);
    }
}

class DrunkDMSettingTab extends PluginSettingTab {
    plugin: DrunkDM;

    constructor(app: App, plugin: DrunkDM) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Drunk DM Settings' });

        new Setting(containerEl)
            .setName('Current File')
            .setDesc('The name of the file to append dice rolls to (without extension)')
            .addText(text => text
                .setPlaceholder('Enter file name')
                .setValue(this.plugin.settings.currentFile)
                .onChange(async (value) => {
                    console.log('Current File setting changed:', value);
                    this.plugin.settings.currentFile = value;
                    await this.plugin.saveSettings();
                }));
    }
}

function getFilesInFolder(vault: any, campaignFolder: string): string[] {
    const folder = vault.getAbstractFileByPath(campaignFolder) as TFolder;
    if (folder && folder.children) {
        return folder.children
            .filter((file: TAbstractFile) => file instanceof TFile)
            .map((file: TFile) => file.name.replace('.md', ''));
    } else {
        console.error('Folder not found or is not a valid folder:', campaignFolder);
        return [];
    }
}

