import { Item, Config } from './db';
import { Resend } from 'resend';


export async function sendNotification(to: string, item: Item, config: Config) {
    const resend = new Resend(config.resendApiKey);

    try {
        const { data, error } = await resend.emails.send({
            from: config.emailFrom,
            to: to,
            subject: `item in stock: ${item.name} 😍🥰😘🤪😻😯♗∞😍`,
            html: `
        <h1>Item Back in Stock!</h1>
        <p><strong>${item.name}</strong> is IN STOCK!!!</p>
        <p><a href="${item.url}">BUY NOW ON ${item.website}</a></p>
        <p>⠀⠀⠀⠀⢀⣤⠤⣄⠀⠀⠀⠀⣠⠤⣄⠀⠀⠀
           ⠀⠀⠀⢠⠞⠀⠀⠈⢷⠀⠀⡜⠃⠀⠈⢳⠀⠀
           ⠀⠀⠀⣾⠀⠀⠀⠀⠘⡇⢰⠅⠀⠀⠀⠸⡇⠀
           ⠀⠀⠀⣿⠀⠀⠀⠀⠀⡇⣾⠀⠀⠀⠀⢸⠃⠀
           ⠀⠀⠀⢹⡀⠀⠀⠀⠀⡇⣿⠀⠀⠀⠀⡾⠀⠀
           ⠀⠀⠀⠸⡇⠀⠀⠀⠀⠷⠿⠀⠀⠀⢰⠇⠀⠀
           ⠀⢀⡴⠛⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⡀⠀
           ⢰⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡄
           ⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣷
           ⢹⠀⠀⠀⢰⡆⠀⠀⠀⠀⠀⠀⢀⣄⠀⠀⠀⡟
           ⠈⢧⡀⠀⠀⠀⠀⠀⢄⡀⣀⠀⠀⠁⠀⠀⣸⠃
           ⠀⠈⠻⢦⣀⠀⠀⠀⠚⠙⠂⠀⠀⠀⣀⡴⠋⠀
           ⠀⠀⠀⠀⠈⠉⠓⠒⠲⠶⠶⠒⠒⠋⠁⠀⠀⠀
</p>
      `
        });

        if (error) {
            console.error('Error sending email:', error);
        } else {
            // console.log('Email sent successfully:', data);
        }
    } catch (err) {
        console.error('Exception sending email:', err);
    }
}