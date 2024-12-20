"use server";

import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase/supabase-client";
import { createStripeCustomer } from "@/services/stripe";

export async function POST(req: Request) {
	try {
		const { name, email, password } = await req.json();

		if (!name || !email || !password) {
			return new Response(
				JSON.stringify({
					message: "Name, email and password are required",
					errors: {
						name: !name ? "Nome é obrigatório" : null,
						email: !email ? "Email é obrigatório" : null,
						password: !password ? "Senha é obrigatória" : null,
					},
				}),
				{ status: 400 },
			);
		}

		// Criação do usuário no Supabase
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name,
				},
			},
		});

		if (error) {
			return new Response(
				JSON.stringify({
					message: "Registration failed",
					error: error.message,
					errors: {
						email: error.message.includes("email") ? error.message : null,
						password: error.message.includes("password") ? error.message : null,
					},
				}),
				{ status: 400 },
			);
		}

		// Criar o usuário no banco de dados Prisma
		try {
			await prisma.user.create({
				data: {
					id: data.user?.id as string,
					email: email,
					name: name,
				},
			});
		} catch (prismaError) {
			console.error("Error creating user in Prisma:", prismaError);
			// Não retornamos erro aqui, pois o usuário já foi criado no Supabase
		}

		// Criar o cliente no Stripe
		try {
			await createStripeCustomer({
				email,
				name,
			});
		} catch (stripeError) {
			console.error(
				"Error creating customer or subscription in Stripe:",
				stripeError,
			);
			// Optional: Pode-se adicionar um fallback caso a criação do cliente ou assinatura falhe
		}

		return new Response(
			JSON.stringify({
				message:
					"Registration successful. Please check your email to confirm your account.",
				data: {
					id: data.user?.id,
					email: data.user?.email,
					name: data.user?.user_metadata?.name,
				},
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("Registration error:", error);
		return new Response(
			JSON.stringify({ message: "An unexpected error occurred" }),
			{ status: 500 },
		);
	}
}
