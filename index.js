require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');
const { isSameMonth } = require('date-fns');

const isTodayInDecember = isSameMonth(new Date(), new Date(2022, 11, 25));
const tree = isTodayInDecember ? ':christmas_tree:' : ':deciduous_tree:';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000
});

const reqConfig = {
  headers: {
    Authorization: process.env.MORETREES_API_KEY
  }
};

const getCarbonOffset = async () => {
  const { data: res  } = await axios.get('https://api.moretrees.eco/v1/basic/carbonOffset', reqConfig);
  const { response, data } = res;
  if (response === 'successful') {
    await say(`${tree} You have offset ${Math.ceil(data.total_carbon_offset * 100) / 100}t of carbon! ${tree}`);
  }
}

const getForest = async () => {
  const { data: res } = await axios.get('https://api.moretrees.eco/v1/basic/getInfo', reqConfig);
  const { message, data } = res;
  if (message === 'successfully') {
    if (data.quantity_planted > 0) {
      await say(`${tree} You have planted ${data.quantity_planted + data.quantity_gifted} trees!\n View the virtual forrest here ${data.forest_url} ${tree}`);
    } else {
      await say(`${tree} You have planted no trees yet! ${tree}`);
    }
  }
}

app.command('/treeumph', async ({ command, ack, say }) => {
  await ack();

  switch (command.text) {
    case 'carbon': {
      await getCarbonOffset();
      break;
    }
    case 'forest': {
      await getForest();
      break;
    }
    default: {
      await say("Think you're barking up the wrong tree. Try `/treeumph carbon` or `/treeumph forest`");
    }
  }
});

app.message('New shoutout from', async ({ message, say }) => {
  if (message.user !== "U035JJL8F9S") return;
  const { data } = await axios.post('https://api.moretrees.eco/v1/basic/planttree', {
    type_slug: 'any_tree',
    request_type: 1,
    quantity: 1
    // users: [
    //   {
    //     first_name: 'Chris',
    //     email: 'chris.winch@ensono.com',
    //     quantity: 1
    //   },
    // ],
  }, reqConfig).catch((err) => {
    console.log({ err: err.message });
  });

  if (data.response === 'successful') {
    await app.client.reactions.add({
      token: process.env.SLACK_BOT_TOKEN,
      name: 'deciduous_tree',
      channel: message.channel,
      timestamp: message.ts
    });
  };
});

(async () => {
  await app.start();

  console.log('⚡️ Bolt app is running!');
})();
