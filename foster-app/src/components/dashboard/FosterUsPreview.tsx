import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import AnimalCard from "../animals/AnimalCard";
import GroupCard from "../animals/GroupCard";
import CancelRequestDialog from "../fosters/CancelRequestDialog";
import LoadingSpinner from "../ui/LoadingSpinner";
import { fetchAnimals } from "../../lib/animalQueries";
import { fetchGroups } from "../../lib/groupQueries";
import { fetchPendingRequestsForItems } from "../../lib/fosterRequestQueries";
import { cancelFosterRequest } from "../../lib/fosterRequestUtils";
import {
	buildAnimalMapByGroupMembership,
	buildFostersNeededAnimalDataMap,
	buildGroupsWithFosterVisibility,
	combineAndSortFostersNeededItems,
	filterAnimalsForFostersNeededList,
	type FostersNeededCombinedItem,
} from "../../lib/fostersNeededList";
import type { FostersNeededFilters } from "../fosters/FostersNeededFilters";
import type { FosterRequest } from "../../types";

const DEFAULT_FILTERS: FostersNeededFilters = {};

const CAROUSEL_MAX_ITEMS = 10;

/**
 * Slightly wider than a strict grid column so the next card peeks in and hints at scrolling.
 * gap-1.5 = 0.375rem; aligns with Fosters Needed max-w-5xl content width.
 */
const CAROUSEL_CARD_WIDTH_CLASSES =
	"shrink-0 snap-start " +
	"w-[min(17rem,calc((100vw-3.5rem)*0.88))] " +
	"min-[375px]:w-[calc((min(100vw,64rem)-2rem-1*0.375rem)/2*1.08)] " +
	"sm:w-[calc((min(100vw,64rem)-2rem-2*0.375rem)/3*1.08)] " +
	"md:w-[calc((min(100vw,64rem)-2rem-3*0.375rem)/4*1.08)] " +
	"lg:w-[calc((min(100vw,64rem)-2rem-4*0.375rem)/5*1.1)]";

function renderCarouselCard(
	item: FostersNeededCombinedItem,
	pendingRequestsMap: Map<string, FosterRequest> | undefined,
	animalDataMap: ReturnType<typeof buildFostersNeededAnimalDataMap>,
	handleCancelRequest: (requestId: string, name: string) => void
) {
	if (item.type === "animal") {
		const pendingRequest = pendingRequestsMap?.get(item.data.id);
		return (
			<AnimalCard
				animal={item.data}
				foster_visibility={item.data.foster_visibility}
				hasPendingRequest={!!pendingRequest}
				requestId={pendingRequest?.id}
				onCancelRequest={
					pendingRequest
						? () =>
								handleCancelRequest(
									pendingRequest.id,
									item.data.name || "Unnamed Animal"
								)
						: undefined
				}
			/>
		);
	}

	const pendingRequest = pendingRequestsMap?.get(item.data.id);
	return (
		<GroupCard
			group={item.data}
			animalData={animalDataMap}
			foster_visibility={item.foster_visibility}
			hideEmptyGroupLabel
			hasPendingRequest={!!pendingRequest}
			requestId={pendingRequest?.id}
			onCancelRequest={
				pendingRequest
					? () =>
							handleCancelRequest(
								pendingRequest.id,
								item.data.name || "Unnamed Group"
							)
					: undefined
			}
		/>
	);
}

export default function FosterUsPreview() {
	const { user, profile, isFoster, isCoordinator } = useProtectedAuth();
	const queryClient = useQueryClient();

	const showPreview = isFoster && !isCoordinator;

	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<{
		requestId: string;
		name: string;
	} | null>(null);

	const {
		data: allAnimals = [],
		isLoading: isLoadingAnimals,
		isError: isErrorAnimals,
		error: animalsError,
	} = useQuery({
		queryKey: [
			"fosters-needed-all-animals",
			user.id,
			profile.organization_id,
		],
		queryFn: async () => {
			return fetchAnimals(profile.organization_id, {
				fields: [
					"id",
					"name",
					"status",
					"sex_spay_neuter_status",
					"priority",
					"photos",
					"date_of_birth",
					"group_id",
					"foster_visibility",
					"created_at",
					"life_stage",
				],
				orderBy: "created_at",
				orderDirection: "asc",
				checkOffline: true,
			});
		},
		enabled: showPreview,
	});

	const {
		data: groupsData = [],
		isLoading: isLoadingGroups,
		isError: isErrorGroups,
		error: groupsError,
	} = useQuery({
		queryKey: ["fosters-needed-groups", user.id, profile.organization_id],
		queryFn: async () => {
			return fetchGroups(profile.organization_id, {
				fields: [
					"id",
					"name",
					"description",
					"animal_ids",
					"priority",
					"group_photos",
					"created_at",
				],
				orderBy: "created_at",
				orderDirection: "asc",
				checkOffline: true,
			});
		},
		enabled: showPreview,
	});

	const animalsData = useMemo(
		() => filterAnimalsForFostersNeededList(allAnimals),
		[allAnimals]
	);

	const animalMapById = useMemo(
		() => buildAnimalMapByGroupMembership(allAnimals),
		[allAnimals]
	);

	const groupsWithVisibility = useMemo(
		() => buildGroupsWithFosterVisibility(groupsData, animalMapById),
		[groupsData, animalMapById]
	);

	const allItemIds = useMemo(() => {
		const animalIds = animalsData.map((a) => a.id);
		const groupIds = groupsData.map((g) => g.id);
		return { animalIds, groupIds };
	}, [animalsData, groupsData]);

	const { data: pendingRequestsMap, refetch: refetchPendingRequests } =
		useQuery<Map<string, FosterRequest>>({
			queryKey: [
				"pending-requests-batch",
				user.id,
				profile.organization_id,
				allItemIds,
			],
			queryFn: async () => {
				return fetchPendingRequestsForItems(
					allItemIds.animalIds,
					allItemIds.groupIds,
					user.id,
					profile.organization_id
				);
			},
			enabled: showPreview,
		});

	const animalDataMap = useMemo(
		() => buildFostersNeededAnimalDataMap(allAnimals),
		[allAnimals]
	);

	const combinedItems = useMemo(
		() =>
			combineAndSortFostersNeededItems(
				animalsData,
				groupsWithVisibility,
				animalMapById,
				DEFAULT_FILTERS,
				""
			),
		[animalsData, groupsWithVisibility, animalMapById]
	);

	const carouselItems = useMemo(
		() => combinedItems.slice(0, CAROUSEL_MAX_ITEMS),
		[combinedItems]
	);

	const moreBeyondCarousel = Math.max(0, combinedItems.length - CAROUSEL_MAX_ITEMS);

	const scrollerRef = useRef<HTMLDivElement>(null);
	const carouselTrackRef = useRef<HTMLDivElement>(null);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const updateScrollHint = useCallback(() => {
		const el = scrollerRef.current;
		if (!el) return;
		const { scrollLeft, scrollWidth, clientWidth } = el;
		setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
	}, []);

	useEffect(() => {
		updateScrollHint();
		const track = carouselTrackRef.current;
		if (!track) return;
		const ro = new ResizeObserver(() => {
			updateScrollHint();
		});
		ro.observe(track);
		return () => ro.disconnect();
	}, [carouselItems.length, moreBeyondCarousel, updateScrollHint]);

	const isLoading = isLoadingAnimals || isLoadingGroups;
	const isError = isErrorAnimals || isErrorGroups;
	const error = animalsError || groupsError;

	const handleCancelRequest = useCallback(
		async (requestId: string, name: string) => {
			setCancelTarget({ requestId, name });
			setCancelDialogOpen(true);
		},
		[]
	);

	const handleConfirmCancel = async (message: string) => {
		if (!cancelTarget) return;

		await cancelFosterRequest(
			cancelTarget.requestId,
			profile.organization_id,
			message
		);

		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-all-animals"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["fosters-needed-groups"],
		});
		await queryClient.invalidateQueries({
			queryKey: ["pending-requests", user.id, profile.organization_id],
		});
		await refetchPendingRequests();
	};

	if (!showPreview) {
		return null;
	}

	return (
		<div className="mb-6">
			<div className="flex items-center justify-between gap-3 mb-4">
				<h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">
					Foster us!
				</h2>
				{combinedItems.length > 0 && (
					<Link
						to="/fosters-needed"
						className="text-sm text-pink-600 hover:text-pink-700 hover:underline font-medium shrink-0"
					>
						View more
					</Link>
				)}
			</div>

			{isLoading && (
				<LoadingSpinner message="Loading foster opportunities..." />
			)}

			{!isLoading && isError && (
				<p className="text-sm text-red-700">
					{error instanceof Error
						? error.message
						: "Unable to load foster opportunities right now."}
				</p>
			)}

			{!isLoading && !isError && combinedItems.length === 0 && (
				<p className="text-sm text-gray-600">
					All animals are cared for right now — check back soon!
				</p>
			)}

			{!isLoading && !isError && carouselItems.length > 0 && (
				<div className="relative">
					<div
						ref={scrollerRef}
						onScroll={updateScrollHint}
						className="overflow-x-auto overflow-y-visible pb-1 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
					>
						<div
							ref={carouselTrackRef}
							className="flex flex-nowrap gap-1.5 items-stretch"
						>
							{carouselItems.map((item) => (
								<div
									key={
										item.type === "animal"
											? `animal-${item.data.id}`
											: `group-${item.data.id}`
									}
									className={CAROUSEL_CARD_WIDTH_CLASSES}
								>
									{renderCarouselCard(
										item,
										pendingRequestsMap,
										animalDataMap,
										handleCancelRequest
									)}
								</div>
							))}
							{moreBeyondCarousel > 0 && (
								<Link
									to="/fosters-needed"
									aria-label={`View ${moreBeyondCarousel} more foster opportunities on Fosters Needed`}
									className="shrink-0 snap-start self-center whitespace-nowrap py-2 text-sm font-semibold text-pink-600 hover:text-pink-700 hover:underline"
								>
									+ {moreBeyondCarousel} more
								</Link>
							)}
						</div>
					</div>
					{canScrollRight && (
						<div
							className="pointer-events-none absolute inset-y-0 -right-px z-[1] w-[calc(3rem+1px)] bg-[linear-gradient(to_left,rgb(249_250_251)_0%,rgb(249_250_251)_28%,rgba(249,250,251,0.75)_55%,rgba(249,250,251,0.28)_78%,transparent_100%)] [transform:translateZ(0)]"
							aria-hidden={true}
						/>
					)}
				</div>
			)}

			{cancelTarget && (
				<CancelRequestDialog
					isOpen={cancelDialogOpen}
					onClose={() => {
						setCancelDialogOpen(false);
						setCancelTarget(null);
					}}
					onConfirm={handleConfirmCancel}
					animalOrGroupName={cancelTarget.name}
				/>
			)}
		</div>
	);
}
