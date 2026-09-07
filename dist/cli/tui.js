import * as p from '@clack/prompts';
import pc from 'picocolors';
import { PluginScanner } from '../harvester/scanner.js';
import { PROFILES } from '../core/profiles.js';
import { ProfileStore } from '../core/profile-store.js';
export async function showSkillSelector(stateManager) {
    console.clear();
    p.intro(pc.bgCyan(pc.black(' AGENT SKILL GATE ')));
    const scanner = new PluginScanner();
    const { manageable, builtInCount, details } = scanner.scanManageable();
    const profileStore = new ProfileStore();
    if (builtInCount > 0) {
        p.log.success(pc.dim(`${builtInCount} native CLI commands protected and enabled.`));
    }
    const userProfiles = profileStore.getProfiles();
    const menuOptions = [
        ...PROFILES.map(prof => ({
            value: `builtin:${prof.id}`,
            label: prof.label,
            hint: prof.description
        })),
        ...userProfiles.map(u => ({
            value: `custom:${u.id}`,
            label: pc.cyan(u.name),
            hint: `${u.description} (${u.skillIds.length} capabilities)`
        })),
        {
            value: 'action:create',
            label: pc.green('➕ Create Custom Profile'),
            hint: 'Bundle selected skills into a reusable profile preset.'
        },
        {
            value: 'action:manual',
            label: '⚙️ Manual Selection (One-off)',
            hint: 'Customize active skills individually.'
        }
    ];
    const selection = await p.select({
        message: 'Select execution profile or preset:',
        options: menuOptions
    });
    if (p.isCancel(selection)) {
        p.cancel('Operation cancelled.');
        process.exit(0);
    }
    const choice = selection;
    let targetSkillIds = [];
    if (choice === 'action:create') {
        const profileName = await p.text({
            message: 'Profile Name:',
            placeholder: 'e.g. 🚀 Fullstack Rapid',
            validate: (v) => (!v.trim() ? 'Profile name cannot be empty.' : undefined)
        });
        if (p.isCancel(profileName))
            return;
        const profileDesc = await p.text({
            message: 'Profile Description:',
            placeholder: 'e.g. Optimized stack for full-stack prototyping.'
        });
        if (p.isCancel(profileDesc))
            return;
        const skillChoices = await p.multiselect({
            message: 'Select capabilities to include in this profile:',
            options: manageable.map(s => ({
                value: s.id,
                label: s.name,
                hint: `${s.description} [~${s.estimatedTokens} tok]`
            }))
        });
        if (p.isCancel(skillChoices))
            return;
        const newProfile = {
            id: profileName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: profileName,
            description: profileDesc || 'Custom user profile.',
            skillIds: skillChoices
        };
        profileStore.saveProfile(newProfile);
        p.log.success(pc.green(`Profile '${newProfile.name}' saved successfully!`));
        targetSkillIds = newProfile.skillIds;
    }
    else if (choice.startsWith('custom:')) {
        const profileId = choice.replace('custom:', '');
        const profile = userProfiles.find(u => u.id === profileId);
        if (profile)
            targetSkillIds = profile.skillIds;
    }
    else if (choice.startsWith('builtin:')) {
        const builtinId = choice.replace('builtin:', '');
        const profile = PROFILES.find(p => p.id === builtinId);
        targetSkillIds = details.filter(cap => profile.filter(cap)).map(cap => cap.id);
    }
    else {
        const activeIds = stateManager.getActiveSkills();
        const manualSelected = await p.multiselect({
            message: 'Toggle capabilities for current workspace:',
            options: manageable.map(s => ({
                value: s.id,
                label: s.name,
                hint: `${s.description} [~${s.estimatedTokens} tok]`
            })),
            initialValues: activeIds,
            required: false
        });
        if (p.isCancel(manualSelected))
            return;
        targetSkillIds = manualSelected;
    }
    for (const skill of manageable) {
        const shouldBeActive = targetSkillIds.includes(skill.id);
        const isCurrentlyActive = stateManager.isSkillActive(skill.id);
        if (shouldBeActive !== isCurrentlyActive) {
            stateManager.toggleSkill(skill.id);
        }
    }
    const totalTokens = manageable
        .filter(s => targetSkillIds.includes(s.id))
        .reduce((acc, curr) => acc + curr.estimatedTokens, 0);
    p.note(`Active Capabilities: ${pc.green(targetSkillIds.length.toString())} / ${manageable.length}\nEstimated Context Overhead: ${pc.yellow(`~${totalTokens} tokens`)}`, 'Session Configuration');
    p.outro(pc.green('✓ Workspace state synchronized.'));
}
