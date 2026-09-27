"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AxiosConfig from "@/app/services/AxiosConfig";
import { API_ENDPOINTS } from "@/app/services/ApiEndpoint";
import { type Car } from "@/lib/types";
import CarCard from "@/components/CarCard";
import type { AxiosResponse } from "axios";

export default function Home() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Car[]>([]);
  const [f, setF] = useState({ name: "" });

  useEffect(() => {
    const controller = new AbortController();

    const fetchFeaturedCars = async () => {
      try {
        const response: AxiosResponse = await AxiosConfig.get(
          API_ENDPOINTS.GET_CARS,
          { signal: controller.signal }
        );
        if (response.status === 200) {
          const carsData: Car[] = response.data?.cars ?? response.data ?? [];
          setFeatured(carsData.slice(0, 4));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFeatured([]);
        }
      }
    };

    fetchFeaturedCars();

    return () => {
      controller.abort();
    };
  }, []);

  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(`/cars?${new URLSearchParams(f).toString()}`);
  };

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Rent a car parked down the street in Manila.
          </h1>
          <p className="mt-4 max-w-md text-lg text-bay/75">
            Owners list cars that sit idle. You book by the day, pay a downpayment, and pick up from a verified neighbor.
          </p>
          <p className="mt-6 text-sm text-bay/70">
            Own a car?{" "}
            <Link href="/register" className="font-semibold text-teal underline">
              List it and see what it could earn
            </Link>
            .
          </p>
        </div>

        <form onSubmit={search} className="overflow-hidden rounded-xl border border-bay/10 bg-white shadow-lg">
          <div className="border-t-4 border-t-jeep p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal">
                Find your ride
              </p>
              <h2 className="mt-1 text-2xl font-bold text-bay">
                Find cars in Manila
              </h2>
              <p className="mt-1 text-sm text-bay/60">
                Search for a car by its name and browse available rentals.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-bay">
                Car name
              </label>
              <input
                type="text"
                className="input h-12"
                placeholder="e.g. Honda Civic, Toyota Vios"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary mt-4 flex h-12 w-full items-center justify-center gap-2">
              <span>Search cars</span>
              <span aria-hidden="true">→</span>
            </button>
            <p className="mt-3 text-center text-xs text-bay/50">
              You can refine your search by type, fuel, seats, and price.
            </p>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Cars people are booking</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {featured.map((c) => (
            <CarCard key={c._id} car={c} />
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="text-2xl font-bold">How a rental works</h2>
        <ol className="mt-4 grid gap-6 text-sm sm:grid-cols-4">
          {[
            ["Request", "Pick dates and see the full cost before you send the request."],
            ["Get approved", "The owner reviews your request and verification."],
            ["Pay the downpayment", "Pay face to face or online once approved."],
            ["Pick up and return", "You and the owner log the car's condition with photos."],
          ].map(([t, d], i) => (
            <li key={t}>
              <span className="font-display text-2xl font-extrabold text-teal">
                {i + 1}
              </span>
              <h3 className="mt-1 font-semibold">{t}</h3>
              <p className="mt-1 text-bay/70">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}