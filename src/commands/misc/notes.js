const { 
  Client, 
  Interaction, 
  ApplicationCommandOptionType, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");
const Notes = require("../../models/Notes");
const chunkMessage = require("../../utils/chunkMessage");

const formatNotesTitle = (userNotes) => {
  const notes = userNotes.notes
  let formattedNotes = ""

  for(const note of notes){
    formattedNotes += `- **${note.title}**\n`
  }

  return formattedNotes
}

const listNotes = async (userNote, notesEmbed, interaction) => {
  if (!userNote.notes || userNote.notes.length === 0) return interaction.editReply({ content: "You have no notes.", components: [] });

  const options = userNote.notes.map((note, i) => {
    const title = note && note.title != null ? String(note.title) : `Untitled ${i + 1}`;
    return {
      label: title.slice(0, 100),
      value: String(i)
    };
  });

  notesEmbed.setTitle(`${interaction.user}'s Notepad`).setDescription(formatNotesTitle(userNote))

  const menu = new StringSelectMenuBuilder()
    .setCustomId("note-list")
    .setMinValues(1)
    .setMaxValues(1)
    .setPlaceholder("Expand your notes here...")
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(menu);
  const reply = await interaction.editReply({ embeds: [notesEmbed], components: [row] });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 600_000
  });

  collector.on("collect", async (interact) => {
    const emitter = interact.user;
    const owner = interaction.user;

    if (emitter.id !== owner.id)
      return interact.reply({ content: "This is not your notes.", flags: MessageFlags.Ephemeral });

    const note = userNote.notes[Number(interact.values[0])];
    const chunkedDescription = chunkMessage(note.note);
    let page = 0;
    let isHidden = false;

    const createButtons = (currentPage, hidden) => {
      const components = [];
      
      if (chunkedDescription.length > 1) {
        components.push(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("‹")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("›")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === chunkedDescription.length - 1)
        );
      }

      components.push(
        new ButtonBuilder()
          .setCustomId(hidden ? "show" : "hide")
          .setLabel(hidden ? "Show" : "Hide")
          .setStyle(hidden ? ButtonStyle.Success : ButtonStyle.Danger)
      );

      return new ActionRowBuilder().addComponents(components);
    };

    notesEmbed.setTitle(note.title).setDescription(chunkedDescription[page]);
    const noteMessage = await interact.reply({ 
      embeds: [notesEmbed], 
      components: [createButtons(page, isHidden)],
      fetchReply: true
    });

    const buttonCollector = noteMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 600_000
    });

    buttonCollector.on("collect", async (btnInt) => {
      if (btnInt.user.id !== owner.id)
        return btnInt.reply({ content: "This isn't your note.", flags: MessageFlags.Ephemeral });

      if (btnInt.customId === "hide") {
        await btnInt.message.delete();
        
        notesEmbed.setDescription(chunkedDescription[page]);
        const newMessage = await btnInt.reply({ 
          content: "🔒 Note is now hidden (only you can see it)",
          embeds: [notesEmbed], 
          components: [createButtons(page, true)],
          flags: MessageFlags.Ephemeral,
          fetchReply: true
        });

        isHidden = true;

        const newCollector = newMessage.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 600_000
        });

        newCollector.on("collect", async (newBtnInt) => {
          if (newBtnInt.customId === "show") {
            await newBtnInt.message.delete();

            notesEmbed.setDescription(chunkedDescription[page]);
            const publicMessage = await newBtnInt.reply({ 
              embeds: [notesEmbed], 
              components: [createButtons(page, false)],
              fetchReply: true
            });

            isHidden = false;
            handlePublicMessage(publicMessage, newBtnInt);
            return;
          }

          if (newBtnInt.customId === "prev" && page > 0) page--;
          else if (newBtnInt.customId === "next" && page < chunkedDescription.length - 1) page++;

          notesEmbed.setDescription(chunkedDescription[page]);
          await newBtnInt.update({ 
            content: "🔒 Note is now hidden (only you can see it)",
            embeds: [notesEmbed], 
            components: [createButtons(page, true)] 
          });
        });

        buttonCollector.stop();
        return;
      }

      if (btnInt.customId === "prev" && page > 0) page--;
      else if (btnInt.customId === "next" && page < chunkedDescription.length - 1) page++;

      notesEmbed.setDescription(chunkedDescription[page]);
      await btnInt.update({ embeds: [notesEmbed], components: [createButtons(page, isHidden)] });
    });

    function handlePublicMessage(message, btnInt) {
      const publicCollector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600_000
      });

      publicCollector.on("collect", async (newBtnInt) => {
        if (newBtnInt.user.id !== owner.id)
          return newBtnInt.reply({ content: "This isn't your note.", flags: MessageFlags.Ephemeral });

        if (newBtnInt.customId === "hide") {
          await newBtnInt.message.delete();
          
          notesEmbed.setDescription(chunkedDescription[page]);
          const ephemeralMessage = await newBtnInt.reply({ 
            embeds: [notesEmbed], 
            components: [createButtons(page, true)],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
          });

          isHidden = true;
          handleEphemeralMessage(ephemeralMessage, newBtnInt);
          publicCollector.stop();
          return;
        }

        if (newBtnInt.customId === "prev" && page > 0) page--;
        else if (newBtnInt.customId === "next" && page < chunkedDescription.length - 1) page++;

        notesEmbed.setDescription(chunkedDescription[page]);
        await newBtnInt.update({ embeds: [notesEmbed], components: [createButtons(page, false)] });
      });
    }

    function handleEphemeralMessage(message, btnInt) {
      const ephemeralCollector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 600_000
      });

      ephemeralCollector.on("collect", async (newBtnInt) => {
        if (newBtnInt.customId === "show") {
          await newBtnInt.message.delete();
          
          notesEmbed.setDescription(chunkedDescription[page]);
          const publicMessage = await newBtnInt.reply({ 
            embeds: [notesEmbed], 
            components: [createButtons(page, false)],
            fetchReply: true
          });

          isHidden = false;
          handlePublicMessage(publicMessage, newBtnInt);
          ephemeralCollector.stop();
          return;
        }

        if (newBtnInt.customId === "prev" && page > 0) page--;
        else if (newBtnInt.customId === "next" && page < chunkedDescription.length - 1) page++;

        notesEmbed.setDescription(chunkedDescription[page]);
        await newBtnInt.update({ 
          embeds: [notesEmbed], 
          components: [createButtons(page, true)] 
        });
      });
    }
  });
};

const addNote = async (userNote, notesEmbed, interaction) => {
  const title = interaction.options.getString("title");
  const note = interaction.options.getString("note");
  const noteObject = { title, note };

  userNote.notes.push(noteObject);
  await userNote.save();

  notesEmbed.setDescription(`Successfully added **"${title}"** to your notes`);
  await interaction.editReply({ embeds: [notesEmbed] });
};

const deleteNote = async (userNote, notesEmbed, interaction) => {
  const title = interaction.options.getString("note-title");
  const idx = (userNote.notes || []).findIndex(n => n && String(n.title) === title);

  if (idx === -1) {
    notesEmbed.setDescription(`Note title not found...`);
    await interaction.editReply({ embeds: [notesEmbed] });
    return;
  }

  userNote.notes.splice(idx, 1);
  await userNote.save();
  notesEmbed.setDescription(`Deleted **"${title}"**`);
  await interaction.editReply({ embeds: [notesEmbed] });
};

const handleNotes = async (client, interaction) => {
  const notesEmbed = new EmbedBuilder().setColor("Blurple").setTimestamp();
  const subcommand = interaction.options.getSubcommand();

  try {
    await interaction.deferReply();
    const query = { guildId: interaction.guild.id, userId: interaction.user.id };
    let userNote = await Notes.findOne(query);
    if (!userNote) userNote = new Notes(query);

    switch (subcommand) {
      case "list":
        await listNotes(userNote, notesEmbed, interaction);
        break;
      case "add":
        await addNote(userNote, notesEmbed, interaction);
        break;
      case "delete":
        await deleteNote(userNote, notesEmbed, interaction);
        break;
      default:
        await interaction.editReply("Invalid subcommand");
        break;
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply("An error occurred while processing your request. Please try again later.");
    } else {
      await interaction.reply("An error occurred while processing your request. Please try again later.");
    }
  }
};

module.exports = {
  name: "notes",
  description: "Create, view, and manage your personal note",
  options: [
    {
      name: "list",
      description: "View your notes",
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: "add",
      description: "Add a new note",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "title",
          description: "Your new note's title",
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: "note",
          description: "The note you want to add",
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },
    {
      name: "delete",
      description: "Delete a note",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "note-title",
          description: "The note's title (CASE SENSITIVE)",
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    }
  ],
  cooldown: 5000,
  serverSpecific: true,
  beta: true,
  callback: handleNotes
};
