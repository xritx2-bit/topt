const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const selfRoleDb = require('../../database/selfRoleDb');
const { infoEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('selfroles')
    .setDescription('Create an interactive self-role selection panel with clickable buttons')
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('Generate a button-based self-role panel')
        .addStringOption(option =>
          option.setName('title')
            .setDescription('Title of the self-role embed')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('description')
            .setDescription('Instructions or description for the panel')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option.setName('role1')
            .setDescription('First selectable role')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('label1')
            .setDescription('Button label for role 1')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role2')
            .setDescription('Second selectable role')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('label2')
            .setDescription('Button label for role 2')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role3')
            .setDescription('Third selectable role')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('label3')
            .setDescription('Button label for role 3')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role4')
            .setDescription('Fourth selectable role')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('label4')
            .setDescription('Button label for role 4')
            .setRequired(false)
        )
        .addRoleOption(option =>
          option.setName('role5')
            .setDescription('Fifth selectable role')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('label5')
            .setDescription('Button label for role 5')
            .setRequired(false)
        )
    ),
  aliases: [],

  async executeSlash(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');

    const rolesData = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) {
        const label = interaction.options.getString(`label${i}`) || role.name;
        rolesData.push({ role, label });
      }
    }

    if (rolesData.length === 0) {
      return interaction.reply({
        embeds: [errorEmbed('No Roles Specified', 'You must specify at least one role for the panel.')],
        ephemeral: true
      });
    }

    // Build buttons row
    const row = new ActionRowBuilder();

    const embed = infoEmbed(title, `${description}\n\n**Click a button below to get or remove your roles:**\n`);

    rolesData.forEach((item, index) => {
      const customId = `sr_${interaction.guild.id}_${item.role.id}_${Date.now()}_${index}`;

      // Save mapping in database
      selfRoleDb.registerSelfRole({
        customId,
        guildId: interaction.guild.id,
        messageId: '',
        roleId: item.role.id,
        label: item.label
      });

      embed.addFields({
        name: `🔹 ${item.label}`,
        value: `Assigns <@&${item.role.id}>`,
        inline: true
      });

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(item.label)
          .setStyle(ButtonStyle.Primary)
      );
    });

    // Send the panel
    const message = await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      embeds: [successEmbed('Panel Created', `Self-roles panel successfully deployed in <#${interaction.channel.id}>!`)],
      ephemeral: true
    });
  }
};
